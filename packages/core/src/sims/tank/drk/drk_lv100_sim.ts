import { Ability, SimSettings, SimSpec } from "@xivgear/core/sims/sim_types";
import { CycleProcessor, CycleSimResult, ExternalCycleSettings, MultiCycleSettings, AbilityUseResult, Rotation, PreDmgAbilityUseRecordUnf } from "@xivgear/core/sims/cycle_sim";
import { CycleSettings } from "@xivgear/core/sims/cycle_settings";
import { CharacterGearSet } from "@xivgear/core/gear";
import { formatDuration } from "@xivgear/core/util/strutils";
import { STANDARD_ANIMATION_LOCK } from "@xivgear/xivmath/xivconstants";
import { DrkGauge } from "./drk_gauge";
import { DrkExtraData, DrkAbility, DrkRotationData, BloodWeaponBuff } from "./drk_types";
import * as Drk250 from './rotations/drk_lv100_250';
import * as Drk246 from './rotations/drk_lv100_246';
import { Unmend } from './drk_actions';
import { BaseMultiCycleSim } from "@xivgear/core/sims/processors/sim_processors";

export interface DrkSimResult extends CycleSimResult {

}

export interface DrkSettings extends SimSettings {
    usePotion: boolean;
    prepullUnmend: number; //the number given is how many seconds prepull we use Unmend.
    fightTime: number; // the length of the fight in seconds
    // TODO: should we add a prepull Shadowstride option? Would be nice to compare on differing killtimes
}

export interface DrkSettingsExternal extends ExternalCycleSettings<DrkSettings> {

}

export const drkSpec: SimSpec<DrkSim, DrkSettingsExternal> = {
    stub: "drk-sim-lv100",
    displayName: "DRK Sim",
    description: `Simulates a DRK rotation using level 100 abilities/traits.
Currently a work in progress, and only fully supports 2.50 and 2.46 GCD speeds.
Defaults to simulating a killtime of 8m 30s (510s).
Results are only currently accurate up to 9 minutes (540s).`,
    makeNewSimInstance: function (): DrkSim {
        return new DrkSim();
    },
    loadSavedSimInstance: function (exported: DrkSettingsExternal) {
        return new DrkSim(exported);
    },
    supportedJobs: ['DRK'],
    supportedLevels: [100],
    isDefaultSim: true,
    maintainers: [{
        name: 'Violet Stardust',
        contact: [{
            type: 'discord',
            discordTag: 'violet.stardust',
            discordUid: '194908170030809098',
        }],
    }],
};

class DrkCycleProcessor extends CycleProcessor {
    gauge: DrkGauge;

    constructor(settings: MultiCycleSettings) {
        super(settings);
        this.cycleLengthMode = 'full-duration';
        this.gauge = new DrkGauge();
    }

    fightEndingSoon(): boolean {
        // If the fight is ending within the next 10 seconds (to dump resources)
        return this.currentTime > (this.totalTime - 10);
    }

    // Gets the DRK ability with Blood Weapon's blood and MP additions
    // added to it.
    getDrkAbilityWithBloodWeapon(ability: DrkAbility): DrkAbility {
        return this.beforeAbility(ability, this.getActiveBuffsFor(ability));         
    }

    override addAbilityUse(usedAbility: PreDmgAbilityUseRecordUnf) {
        // Add gauge data to this record for the UI
        const extraData: DrkExtraData = {
            gauge: this.gauge.getGaugeState(),
            darksideDuration: 0,
        };
        
        const darkside = usedAbility.buffs.find(buff => buff.name === "Darkside")
        if (darkside) {
            const buffData = this.getActiveBuffData(darkside, usedAbility.usedAt)
            if (buffData) {
                extraData.darksideDuration = Math.round(buffData.end - usedAbility.usedAt)
            }
        }

        const modified: PreDmgAbilityUseRecordUnf = {
            ...usedAbility,
            extraData,
        };

        super.addAbilityUse(modified);
    }
}

export class DrkSim extends BaseMultiCycleSim<DrkSimResult, DrkSettings, DrkCycleProcessor> {
    spec = drkSpec;
    shortName = "drk-sim-lv100";
    displayName = drkSpec.displayName;
    cycleSettings: CycleSettings = {
        useAutos: true,
        totalTime: this.settings.fightTime,
        cycles: 0,
        which: 'totalTime',
    }
    mpTicks = 0

    constructor(settings?: DrkSettingsExternal) {
        super('DRK', settings);
    }

    protected createCycleProcessor(settings: MultiCycleSettings): DrkCycleProcessor {
        return new DrkCycleProcessor({
            ...settings,
            hideCycleDividers: true
        });
    }

    override makeDefaultSettings(): DrkSettings {
        return {
            usePotion: true,
            prepullUnmend: 1, 
            // 8 minutes and 30s, or 510 seconds
            // This is chosen since it's two pots, five bursts,
            // and is somewhat even between the two main GCDs.
            fightTime: (8 * 60) + 30,
        };
    }

    use(cp: DrkCycleProcessor, ability: Ability): AbilityUseResult {
        if (cp.currentTime >= cp.totalTime) {
            return null;
        }

        const drkAbility = ability as DrkAbility;

        // Add 200 mp every ~3sish. Very imperfect, but it'll do for now.
        // In the future, MP should probably be refactored into the base processor.
        // We use Math.floor to be pessimistic, i.e. worst case mana ticks.
        const expectedMPTicks = Math.floor(Math.round(cp.currentTime) / 3)
        // Reset mpTicks at the start of a new fight or simulation.
        if (expectedMPTicks == 0) {
            this.mpTicks = 0
        }
        const differenceInMPTicks = expectedMPTicks - this.mpTicks
        if (differenceInMPTicks > 0) {
            this.mpTicks += differenceInMPTicks
            cp.gauge.magicPoints += differenceInMPTicks * 200
        }

        // Log when we try to use more gauge than what we currently have
        if (drkAbility.id === 7392 && cp.gauge.bloodGauge < 50) {
            console.warn(`[${formatDuration(cp.currentTime)}][DRK Sim] Attempted to use Bloodspiller when you only have ${cp.gauge.bloodGauge} blood`);
            return null;
        }

        // If an Ogcd isn't ready yet, but it can still be used without clipping, advance time until ready.
        if (ability.type === 'ogcd' && cp.canUseWithoutClipping(ability)) {
            const readyAt = cp.cdTracker.statusOf(ability).readyAt.absolute;
            if (cp.totalTime > readyAt) {
                cp.advanceTo(readyAt);
            }
        }

        // Only use potion if enabled in settings
        if (!this.settings.usePotion && ability.name.includes("of strength")) {
            return null;
        }

        // Update gauges
        const abilityWithBloodWeapon = cp.getDrkAbilityWithBloodWeapon(ability)
        if (abilityWithBloodWeapon.updateBloodGauge !== undefined) {
            // Prevent gauge updates showing incorrectly on autos before this ability
            if (ability.type === 'gcd' && cp.nextGcdTime > cp.currentTime) {
                cp.advanceTo(cp.nextGcdTime);
            }
            abilityWithBloodWeapon.updateBloodGauge(cp.gauge);
        }
        if (abilityWithBloodWeapon.updateMP !== undefined) {
            // Prevent gauge updates showing incorrectly on autos before this ability
            if (ability.type === 'gcd' && cp.nextGcdTime > cp.currentTime) {
                cp.advanceTo(cp.nextGcdTime);
            }
            abilityWithBloodWeapon.updateMP(cp.gauge);
        }

        const abilityUseResult = cp.use(ability);

        // TODO use up remaining gauge and Shadowbringer before the fight ends
        if (ability.type === 'gcd' && cp.fightEndingSoon()) {
            // TODO: cp.use(action name goes here);
        }

        return abilityUseResult;
    }

    static getRotationForGcd(gcd: number): DrkRotationData {
        // TODO: Once a generic computational rotation,
        // it should be used for non-2.50/2.46 GCDs.

        // This is fairly coarse as of right now, and supports
        // only 2.46 and 2.50 particularly well. However, this
        // seems good enough for a first draft, as those are
        // the salient GCD speeds.

        if (gcd <= 2.46) {
            return {
                name: "2.46 GCD Rotation",
                rotation: {
                    opener: [...Drk246.Opener],
                    loop: [...Drk246.Loop],
                }
            }
        }

        return {
            name: "2.50 GCD Rotation",
            rotation: {
                opener: [...Drk250.Opener],
                loop: [...Drk250.Loop],
            }
        }
    }

    getRotationsToSimulate(set: CharacterGearSet): Rotation<DrkCycleProcessor>[] {
        const gcd = set.results.computedStats.gcdPhys(2.5);
        const { name, rotation } = DrkSim.getRotationForGcd(gcd);
        const settings = { ...this.settings };
        const outer = this;

        console.log(`[DRK Sim] Running ${name}...`);
        return [{
            name: name,
            cycleTime: (9 * 60),
            apply(cp: DrkCycleProcessor) {
                // Pre-pull Unmend timing
                const first = rotation.opener.shift();
                cp.use(first);
                if (first.name === Unmend.name && settings.prepullUnmend > STANDARD_ANIMATION_LOCK) {
                    cp.advanceTo(settings.prepullUnmend - STANDARD_ANIMATION_LOCK);
                }

                // Opener
                rotation.opener.forEach(action => outer.use(cp, action));

                // Loop
                if (rotation.loop?.length) {
                    cp.remainingCycles(() => {
                        rotation.loop.forEach(action => outer.use(cp, action));
                    });
                }
            }
        }];
    }
} 
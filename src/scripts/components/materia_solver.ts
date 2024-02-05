import { GearPlanSheet } from "../components";
import { CharacterGearSet, EquippedItem } from "../gear";
import { EquipSlots, EquipmentSet, GearItem, Materia, MeldableMateriaSlot, RawStats } from "../geartypes";
import { Simulation, SimSpec } from "../simulation";
import { MateriaSubstat, MateriaSubstats } from "../xivconstants";
import { makeActionButton } from "./util";


export class MeldSolverSettings {
    sim: Simulation<any, any, any>;
    simSpec: SimSpec<any, any>;
}

class MateriaSet {
    sks: number;
    sps: number;
    crit: number;
    det: number;
    dhit: number;
    ten: number;
    smallSks: number = 0;
    smallSps: number = 0;
    smallCrit: number = 0;
    smallDet: number = 0;
    smallDhit: number = 0;
    smallTen: number = 0;
    totalMelds: number = 22;
}

export class MeldSolverMenu extends HTMLElement {

    solver: MeldSolver;
    gearset: CharacterGearSet;
    num: number = 32;

    constructor(sheet: GearPlanSheet) {
        super();

        this.solver = new MeldSolver(sheet);
        console.log("Menu print");

        const header = document.createElement('span');
        header.textContent = 'Meld Solver';
        const button = makeActionButton('Solve Materia', () => {
            this.solveMeldsButton();
         })
        this.replaceChildren(header, document.createElement('br'), button);
    }

    refresh(gearset: CharacterGearSet) {
        this.gearset = gearset;
    }

    solveMeldsButton() {

        let materia: MateriaSet = {
            sks: 3,
            sps: 2,
            crit: 3,
            det: 1,
            dhit: 1,
            ten: 0,
            totalMelds: 10,
            smallSks: 0,
            smallSps: 0,
            smallCrit: 0,
            smallDet: 0,
            smallDhit: 0,
            smallTen: 0
        }
        if (this == undefined) {
            console.log("NULL");
            return;
        }
        this.solver.fillMateria(this.gearset, materia);
    }


}

export class MeldSolver {
    
    sheet: GearPlanSheet;

    constructor(sheet: GearPlanSheet) {
        this.sheet = sheet;
    }

    materiaIterable(equipment: EquipmentSet) {

    }
    
    hasteFillPrio = ['Weapon', '']
    getGcd(equipment: CharacterGearSet): number {
        return equipment.isStatRelevant("spellspeed")
            ? equipment.computedStats.gcdMag(2.5)
            : equipment.computedStats.gcdPhys(2.5);
    }

    clearMateria(equipment: EquipmentSet) {

        for (let slotKey of EquipSlots) {
            equipment[slotKey].melds.forEach(meldslot => meldslot.equippedMateria = null);
        }
    }

    fillOneMateria(equipSlot: EquippedItem, meldSlot: MeldableMateriaSlot, stats: RawStats, materiaToMeld: MateriaSet, desiredStat: MateriaSubstat) {
        const substatCap = stats[equipSlot.gearItem.primarySubstat];

        if (meldSlot.equippedMateria) return;

        let materia = this.sheet.getBestMateria(desiredStat, meldSlot);
        if (materiaToMeld[desiredStat] > 0 && substatCap - stats[desiredStat] - materia.primaryStatValue > 2) {
            meldSlot.equippedMateria = materia;
            materiaToMeld[desiredStat]--;
        }

    }


    getAvailableMateria(relevantSubstats: MateriaSubstat, equippedItem: EquippedItem, maxGrade: number): Materia[][] {

        let materia: Materia[][] = [];

        let substatCap = equippedItem.gearItem.statCaps.crit;

        let slotIndex = 0;
        for (let slot of equippedItem.melds) {
            if (slot.materiaSlot.maxGrade > maxGrade) {
                continue;
            }

            materia.push([]);

            for (let stat of relevantSubstats) {
                if (equippedItem.gearItem.stats[stat] == substatCap) {
                    continue;
                }

                let exampleMateria = this.sheet.getBestMateria("crit", slot)
                let statValue  = exampleMateria.primaryStatValue;
                let numAvailableSubstat = substatCap - equippedItem.gearItem.stats[stat]
                let numMateria = Math.floor(numAvailableSubstat / statValue);

                if (numMateria > slotIndex) { // ensures that if a gearpiece can fit only up to, e.g. 1 matera of this substat, then only the first slot will have that materia available.
                    materia[slotIndex].push(exampleMateria);
                }
                
            }

            slotIndex++;
        }

        return materia;

    }

    /**
     * Fills in two passes: First fills slots which don't have crit available, and then only fills slots with crit available
     * if we still need to meld haste.
     */
    fillHasteMateria(gearset: CharacterGearSet, materiaToMeld: MateriaSet) {


        for (let slotKey of EquipSlots) {
            const equipSlot = gearset.equipment[slotKey] as EquippedItem | null;
            const gearItem = equipSlot?.gearItem;
            if (gearItem) {
                for (let meldslot of equipSlot.melds) {
                    if (meldslot.equippedMateria) {
                        continue;
                    }

                    const stats = gearset.getSlotEffectiveStats(slotKey);
                    const substatCap = stats[equipSlot.gearItem.primarySubstat];

                }
            }
            else {
                console.log("Item not found: " + slotKey);
            }
        }

    } 

    settings: MeldSolverSettings;
    equipment: EquipmentSet;

    /*
     * Assumes food is already set.
     */
    fillHasteSlots(gearset: CharacterGearSet, desiredGcd: number) {
        
        this.clearMateria(gearset.equipment)
        
        if (this.getGcd(gearset) < desiredGcd) {
            return;
        }

        for (let slotKey of EquipSlots) {
            let grade = gearset.equipment[slotKey].gearItem.materiaSlots[0].maxGrade;
        }
    }

    /*
    solveMelds(): EquipmentSet {

        let simm = this.settings.sim;
    }
    */
}

customElements.define("meld-solver-menu", MeldSolverMenu);
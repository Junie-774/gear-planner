import {ILvlRangePicker} from "./items";
import {ItemDisplaySettings, MateriaAutoFillController} from "@xivgear/xivmath/geartypes";
import {MateriaPriorityPicker} from "./materia";
import {StatTierDisplay} from "./stat_tier_display";
import {CharacterGearSet} from "@xivgear/core/gear";
import {GearPlanSheet} from "@xivgear/core/sheet";
import { MeldSolverBar } from "./meld_solver_bar";

export class GearEditToolbar extends HTMLDivElement {
    private readonly statTierDisplay: StatTierDisplay;
    private readonly meldSolverBar: MeldSolverBar;

    constructor(sheet: GearPlanSheet,
                itemDisplaySettings: ItemDisplaySettings,
                displayUpdateCallback: () => void,
                matFillCtrl: MateriaAutoFillController,
    ) {
        super();
        this.classList.add('gear-set-editor-toolbar');

        // const leftDrag = quickElement('div', ['toolbar-float-left'], [document.createTextNode('≡')])
        // const rightDrag = quickElement('div', ['toolbar-float-right'], [document.createTextNode('≡')])
        // this.appendChild(leftDrag);
        // this.appendChild(rightDrag);

        const ilvlDiv = document.createElement('div');
        ilvlDiv.classList.add('ilvl-picker-area');
        const itemIlvlRange = new ILvlRangePicker(itemDisplaySettings, 'minILvl', 'maxILvl', 'Gear:');
        itemIlvlRange.addListener(displayUpdateCallback);
        ilvlDiv.appendChild(itemIlvlRange);

        const foodIlvlRange = new ILvlRangePicker(itemDisplaySettings, 'minILvlFood', 'maxILvlFood', 'Food:');
        foodIlvlRange.addListener(displayUpdateCallback);
        ilvlDiv.appendChild(foodIlvlRange);

        this.appendChild(ilvlDiv);

        const materiaPriority = new MateriaPriorityPicker(matFillCtrl);
        this.appendChild(materiaPriority);

        this.statTierDisplay = new StatTierDisplay(sheet);
        this.appendChild(this.statTierDisplay);

        this.meldSolverBar = new MeldSolverBar(sheet);
        this.appendChild(this.meldSolverBar);
    }

    refresh(gearSet: CharacterGearSet) {
        this.statTierDisplay.refresh(gearSet);
        this.meldSolverBar.refresh(gearSet);
    }
}

customElements.define('gear-edit-toolbar', GearEditToolbar, {extends: 'div'});
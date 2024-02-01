import {ILvlRangePicker} from "./items";
import {ItemDisplaySettings, MateriaAutoFillController} from "../geartypes";
import {MateriaPriorityPicker} from "./materia";
import {StatTierDisplay} from "./stat_tier_display";
import {CharacterGearSet} from "../gear";
import {GearPlanSheet} from "../components";
import {FieldBoundCheckBox, quickElement} from "./util";
import { MeldSolverMenu } from "./materia_solver";

export class GearEditToolbar extends HTMLDivElement {
    private readonly statTierDisplay: StatTierDisplay;
    private readonly meldSolverMenu: MeldSolverMenu;

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
        const itemIlvlRange = new ILvlRangePicker(itemDisplaySettings, 'minILvl', 'maxILvl', 'Items:');
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

        this.meldSolverMenu = new MeldSolverMenu(sheet);
        this.appendChild(this.meldSolverMenu);
    }

    refresh(gearSet: CharacterGearSet) {
        this.statTierDisplay.refresh(gearSet);
        this.meldSolverMenu.refresh(gearSet);
    }
}

customElements.define('gear-edit-toolbar', GearEditToolbar, {extends: 'div'});
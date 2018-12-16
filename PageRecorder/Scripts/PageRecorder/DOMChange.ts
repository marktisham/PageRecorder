
//
// Captures one specific change event on the page
//

namespace PageRecorder {

    export enum DOMChangeType {
        AddChild, RemoveChild, UpdateAttributes, UpdateValue
    }

    // A single change in the DOM we can use for replay
    export class DOMChange {
        constructor() {
            this.classList = new Array<string>();
        }

        // Pull out the bare minimum fields we need for replay
        // Note: MutationEvent returns NodeList, but we need Element properties which seem to
        // be set properly by MutationList. Taking out type checking for that parm to work around.
        public Init(changeType: DOMChangeType, elem, parentPath: string,
            previousSiblingPath: string, nextSiblngPath: string, elapsedTime: number) {

            this.ChangeType = changeType;
            this.ParentPath = parentPath;
            this.PreviousSiblingPath = previousSiblingPath;
            this.NextSiblingPath = nextSiblngPath;
            this.ElapsedTime = elapsedTime;

            if (changeType == DOMChangeType.RemoveChild) {
                return;
            }
            if (changeType == DOMChangeType.UpdateValue) {
                this.value = elem.value;
                return;
            }

            if (elem.classList != null && elem.classList.length > 0) {
                this.classList = new Array<string>();
                for (var i = 0; i < elem.classList.length; ++i) {
                    this.classList.push(elem.classList.item(i));
                }
            }
            if (elem.attributes != null && elem.attributes.length > 0) {
                // https://stackoverflow.com/questions/2048720/get-all-attributes-from-a-html-element-with-javascript-jquery
                var nodes = [], values = [];
                for (var att, i = 0, atts = elem.attributes, n = atts.length; i < n; i++) {
                    att = atts[i];
                    if (att.NodeName == "class" || att.NodeName == "id") {
                        // Already got these above
                        continue;
                    }

                    this.attributes[att.nodeName] = att.nodeValue;
                }
            }

            if (changeType == DOMChangeType.UpdateAttributes) {
                return;
            }

            this.tagName = elem.tagName;

            if (elem.id != null && elem.id.length > 0) {
                this.id = elem.id;
            }

            if (elem.nodeValue != null && elem.nodeValue.length > 0) {
                this.value = elem.nodeValue;
            }

            if (this.SetInnerText(elem)) {
                if (elem.innerText != null && elem.innerText.length > 0) {
                    this.text = elem.innerText;
                }
            }

            if (elem.innerHTML != null && elem.innerHTML.length > 0) {
                this.innerHTML = elem.innerHTML;
            }
        }

        // Workarounds for strange DOM inconsistencies...
        public SetInnerText(elem): boolean {
            var tag = elem.tagName.toLowerCase();
            if (tag == "option") {
                // TODO: This is terrible
                return true;
            }

            return false;
        }

        public CreateElementFromValues() : Element {
            var elem: Element = document.createElement(this.tagName);
            this.UpdateElemValues(elem);
            return elem;
        }

        public UpdateElemValues(elem: Element) {

            if (this.id != null && this.id.length>0) {
                elem.id = this.id;
            }
            if (this.value != null && this.value.length>0) {
                elem.nodeValue = this.value;
            }
            if (this.text != null && this.text.length>0) {
                elem.textContent = this.text;
            }

            if (this.innerHTML != null && this.innerHTML.length > 0) {
                elem.innerHTML = this.innerHTML;
            }

            elem.className = "";
            for (var i = 0; i < this.classList.length; ++i) {
                elem.classList.add(this.classList[i]);
            }

            for (let key in this.attributes) {
                if (key == "class" || key == "id") {
                    continue;
                }
                let value = this.attributes[key];
                elem.setAttribute(key, value);

                // TODO: remove old attributes no longer used?
            }

            return elem;
        }

        ChangeType: DOMChangeType;
        ParentPath: string;
        PreviousSiblingPath: string;
        NextSiblingPath: string;
        ElapsedTime: number;

        // DOM element fields
        tagName: string;
        text: string;
        innerHTML: string;
        value: string;
        id: string;
        classList: Array<string>;
        attributes: {[key: string]: string;} = {};
    }

}
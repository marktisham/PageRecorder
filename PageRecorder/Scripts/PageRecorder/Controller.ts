/// <reference path="../typings/jquery/jquery.d.ts" />

//
// Primary controller to drive client side actions on the recorder page
//

namespace PageRecorder {

    export enum PageMode {
        Playback, Recording, Stopped
    }

    export class PageController {
        constructor() {
            this.WatchAreaRootElement = document.getElementById("dom_watch_area");
            this.Recorder = new DOMRecorder();
            this.Player = new DOMPlayer();
            this.AddPanel(this.WatchAreaRootElement);
            this.PlaybackAvailable = false;
            this.SetPageMode(PageMode.Stopped);
            this.InitPlaybackSpeedHandler();
        }

        //
        // Page Mode State Management
        //

        public SetPageMode(mode: PageMode) {
            this.PageMode = mode;
            switch (mode) {
                case PageMode.Recording:
                    this.SetPageModeRecording();
                    break;
                case PageMode.Stopped:
                    this.SetPageModeStopped();
                    break;
                case PageMode.Playback:
                    this.SetPageModePlayback();
                    break;
                default:
                    throw new Error("Unknown page mode");
            }
        }

        private SetPageModeRecording() : void {
            this.SetWatchAreaDisabled(false);
            this.SetRootCommandsDisabled(false);
            this.SetRecordButtonDisabled(true);
            this.SetStopButtonDisabled(false);
            this.SetPlayButtonDisabled(true);
            this.SetPlaySpeedDisabled(true);
        }

        private SetPageModeStopped(): void {
            this.SetWatchAreaDisabled(true);
            this.SetRootCommandsDisabled(true);
            this.SetRecordButtonDisabled(false);
            this.SetStopButtonDisabled(true);

            if (this.PlaybackAvailable) {
                this.SetPlayButtonDisabled(false);
                this.SetPlaySpeedDisabled(false);
            }
            else {
                this.SetPlayButtonDisabled(true);
                this.SetPlaySpeedDisabled(true);
            }
        }

        private SetPageModePlayback(): void {
            this.SetWatchAreaDisabled(false);
            this.SetRootCommandsDisabled(true);
            this.SetRecordButtonDisabled(true);
            this.SetStopButtonDisabled(false);
            this.SetPlayButtonDisabled(true);
            this.SetPlaySpeedDisabled(false);
        }

        private SetRecordButtonDisabled(disabled: boolean): void {
            var elem: Element = document.getElementById("recordbutton");
            this.SetElementDisabled(elem, disabled);
        }

        private SetStopButtonDisabled(disabled: boolean): void {
            var elem: Element = document.getElementById("stopbutton");
            this.SetElementDisabled(elem, disabled);
        }

        private SetPlayButtonDisabled(disabled: boolean): void {
            var elem: Element = document.getElementById("replaybutton");
            this.SetElementDisabled(elem, disabled);

            elem.classList.remove("btn-default");
            elem.classList.remove("btn-success");
            if (this.PlaybackAvailable) {
                elem.classList.add("btn-success");
            }
            else {
                elem.classList.add("btn-default");
            }
        }

        private SetPlaySpeedDisabled(disabled: boolean): void {
            var elem: Element = document.getElementById("playback-speed");
            this.SetElementDisabled(elem, disabled);
        }

        private SetRootCommandsDisabled(disabled: boolean) {
            var rootCommands: Element = document.getElementById("root_commands");
            this.SetElementsDisabled(rootCommands.querySelectorAll("button"), disabled);
        }

        private SetWatchAreaDisabled(disabled: boolean) {
            this.SetElementsDisabled(this.WatchAreaRootElement.querySelectorAll("button"), disabled);
            this.SetElementsDisabled(this.WatchAreaRootElement.querySelectorAll("input"), disabled);
            this.SetElementsDisabled(this.WatchAreaRootElement.querySelectorAll("select"), disabled);
        }

        private SetElementDisabled(elem: Element, disabled: boolean): void {
            if (disabled) {
                elem.setAttribute("disabled", "true");
            }
            else {
                elem.removeAttribute("disabled");
            }
        }

        private SetElementsDisabled(elems, disabled: boolean): void {
            if (disabled) {
                for (var i = 0; i < elems.length; ++i) {
                    var elem: Element = elems[i];
                    elem.setAttribute("disabled", "true");
                }
            }
            else {
                for (var i = 0; i < elems.length; ++i) {
                    var elem: Element = elems[i];
                    elem.removeAttribute("disabled");
                }
            }
        }

        //
        // Timer Status
        //

        public SetTimerStatus(msg: string): void {
            var elem: Element = document.getElementById("timer_status");
            elem.textContent = msg;
        }

        public AppendTimerStatus(msg: string): void {
            var elem: Element = document.getElementById("timer_status");
            elem.textContent = elem.textContent + msg;
        }

        //
        // Button Actions
        //

        public Record() {
            // Post current contents of the watch area as a starting point
            this.SetPageMode(PageMode.Recording);
            var watchAreaHTML: string = this.WatchAreaRootElement.innerHTML;
            watchAreaHTML = htmlEncode(watchAreaHTML);

            $.ajax({
                method: "POST",
                url: "/Home/Record",
                data: {
                    InitialDOM: watchAreaHTML
                }
            }).done(function (response) {
                Controller.SessionID = response;

                // Start recording changes
                Controller.Recorder.StartRecording(Controller.WatchAreaRootElement);

            }).fail(function (response) {
                alert(response.status + " " + response.statusText + ":\n\n" + response.responseText);
            });
        }

        public Stop() {
            Controller.Recorder.StopRecording();
            Controller.Player.StopPlayback();

            // Change state after recording stopped, else state change is captured by recording
            this.SetPageMode(PageMode.Stopped);
        }

        public Play(): void {
            this.SetPageMode(PageMode.Playback);

            var getURL = "/Home/Playback?SessionID=" + this.SessionID;
            $.ajax({
                method: "GET",
                url: getURL
            }).done(function (response) {
                Controller.WatchAreaRootElement.innerHTML = htmlDecode(response);
                Controller.Player.ReplayChanges();
            }).fail(function (response) {
                alert(response.status + " " + response.statusText + ":\n\n" + response.responseText);
            });
        }

        //
        // DOM Manipulators...
        //

        public AddRootPanel() {
            this.AddPanel(this.WatchAreaRootElement);
        }

        public AddChildPanel(parentID: string) {
            var panel: Element = document.getElementById(parentID);
            var nesting: Element = panel.getElementsByClassName("nesting")[0];
            this.AddPanel(nesting);
        }

        public AddSiblingPanel(panelID: string) {
            var panel: Element = document.getElementById(panelID);
            var panelParent: Element = panel.parentElement;
            var panelNextSibling: Element = this.GetSiblingPanel(panelID, true);
            this.AddPanel(panelParent, panelNextSibling);
        }

        public MovePanel(panelID: string, moveNext: boolean) {
            var panel: Element = document.getElementById(panelID);
            var panelSibling: Element;
            if (moveNext) {
                panelSibling = this.GetSiblingPanel(panelID, true);
                if (panelSibling == null) {
                    // Already at end
                    return;
                }

                // Inserting "before" the node after next
                panelSibling = this.GetSiblingPanel(panelSibling.id, true);
            }
            else {
                panelSibling = this.GetSiblingPanel(panelID, false);
                if (panelSibling == null) {
                    // Already at start
                    return;
                }
            }

            // Detach and move the node
            var panelParent: Element = panel.parentElement;
            panelParent.removeChild(panel);
            panelParent.insertBefore(panel, panelSibling);
        }

        public GetSiblingPanel(panelID: string, next: boolean) {
            var panel: Element = document.getElementById(panelID);
            var panelParent: Element = panel.parentElement;
            var panelSibling: Element = null;
            for (var i = 0; i < panelParent.children.length; ++i) {
                var panelChild: Element = panelParent.children[i];
                if (panelChild.id == panelID) {
                    if (next) {
                        if (i < (panelParent.children.length - 1)) {
                            return panelParent.children[i + 1];
                        }
                    }
                    else {
                        if (i > 0) {
                            return panelParent.children[i - 1];
                        }
                    }
                    break;
                }
            }
            return null;
        }

        public AddPanel(parent: Element, insertBefore: Element = null) {

            var controlID: number = ++this.ControlID;
            var panelID: string = "testpanel_" + controlID;

            // Boy this should really be a React component...

            var panelRoot: Element = document.createElement("div");
            panelRoot.id = panelID;
            panelRoot.classList.add("panel");
            panelRoot.classList.add("panel-warning");
            panelRoot.classList.add("testpanel");

            var panelHeading: Element = document.createElement("div");
            panelHeading.classList.add("panel-heading");
            panelRoot.appendChild(panelHeading);

            var buttonGroup: Element = this.CreateButtonGroup();
            panelHeading.appendChild(buttonGroup);

            var button: Element;
            var action: string;

            action = "PageRecorder.Controller.AddChildPanel('" + panelID + "');";
            button = this.CreateButton("fa-plus", "Add Child", action);
            buttonGroup.appendChild(button);

            action = "PageRecorder.Controller.AddSiblingPanel('" + panelID + "');";
            button = this.CreateButton("fa-copy", "Add Sibling", action);
            buttonGroup.appendChild(button);

            var buttonGroup: Element = this.CreateButtonGroup();
            panelHeading.appendChild(buttonGroup);

            action = "PageRecorder.Controller.MovePanel('" + panelID + "',false);";
            button = this.CreateButton("fa-arrow-up", "Move Up", action);
            buttonGroup.appendChild(button);

            action = "PageRecorder.Controller.MovePanel('" + panelID + "',true);";
            button = this.CreateButton("fa-arrow-down", "Move Down", action);
            buttonGroup.appendChild(button);

            action = "PageRecorder.Controller.ChangeElement('" + panelID + "');";
            button = this.CreateButton("fa-pencil-square-o", "Change Style", action);
            buttonGroup.appendChild(button);

            var buttonGroup: Element = this.CreateButtonGroup();
            panelHeading.appendChild(buttonGroup);

            action = "PageRecorder.Controller.DeleteElement('" + panelID + "');";
            button = this.CreateButton("fa-trash", "Delete", action);
            buttonGroup.appendChild(button);

            var badgeDiv: Element = document.createElement("div");
            var badge: Element = document.createElement("span");
            badgeDiv.classList.add("panelnumber");
            badgeDiv.classList.add("badge");
            badgeDiv.classList.add("badge-success");
            badge.textContent = "Panel " + controlID;
            badgeDiv.appendChild(badge);
            panelHeading.appendChild(badgeDiv);

            var panelBody: Element = document.createElement("div");
            panelBody.classList.add("panel-body");
            panelRoot.appendChild(panelBody);

            var input: Element = document.createElement("input");
            input.classList.add("form-control");
            input.setAttribute("placeholder", "Type something...");
            input.setAttribute("value", "Panel " + controlID);
            panelBody.appendChild(input);

            var select: Element = document.createElement("select");
            select.classList.add("form-control");
            panelBody.appendChild(select);

            var option: Element = document.createElement("option");
            option.textContent = "Select Something..."
            option.setAttribute("value", "1");
            option.setAttribute("selected", "true");
            select.appendChild(option);

            option = document.createElement("option");
            option.textContent = "Second"
            option.setAttribute("value", "2");
            select.appendChild(option);

            option = document.createElement("option");
            option.textContent = "Third"
            option.setAttribute("value", "3");
            select.appendChild(option);

            option = document.createElement("option");
            option.textContent = "Fourth"
            option.setAttribute("value", "4");
            select.appendChild(option);

            // For new children...
            var nesting: Element = document.createElement("div");
            nesting.classList.add("nesting");
            panelBody.appendChild(nesting);

            // Insert the whole shebang in one DOM change event
            if (insertBefore != null) {
                parent.insertBefore(panelRoot, insertBefore);
            }
            else {
                parent.appendChild(panelRoot);
            }
        }

        CreateButtonGroup(): Element {
            var buttonGroup: Element = document.createElement("div");
            buttonGroup.classList.add("btn-group");
            buttonGroup.setAttribute("role", "group");
            return buttonGroup;
        }

        CreateButton(iconClass: string, text: string, action: string) {
            var button: Element = document.createElement("button");
            button.classList.add("btn");
            button.classList.add("btn-default");
            button.setAttribute("onclick", action);

            var iconElement: Element = document.createElement("i");
            iconElement.classList.add("fa");
            iconElement.classList.add(iconClass);
            button.appendChild(iconElement);

            var textElement: Element = document.createElement("span");
            textElement.textContent = text;
            button.appendChild(textElement);

            return button;
        }

        ChangeElement(domID: string) {
            var elem: Element = document.getElementById(domID);
            for (var i = 0; i < elem.classList.length; ++i) {
                var classStr: string = elem.classList[i].toString();
                if (classStr == "panel-warning") {
                    elem.classList.remove("panel-warning");
                    elem.classList.add("panel-danger");
                    break;
                }
                else if (classStr == "panel-danger") {
                    elem.classList.remove("panel-danger");
                    elem.classList.add("panel-warning");
                    break;
                }
            }
        }

        public DeleteElement(domID: string) {
            document.getElementById(domID).remove();
        }

        public RemoveAllFromDOM() {
            for (var i = this.WatchAreaRootElement.children.length - 1; i >= 0; --i) {
                var childElem: Element = this.WatchAreaRootElement.children[i];
                this.WatchAreaRootElement.removeChild(childElem);
            }
        }

        //
        // General Helpers
        //

        InitPlaybackSpeedHandler(): void {
            var speedElem: Element = document.getElementById("playback-speed");
            speedElem.addEventListener("change", function (event: any) {
                PageRecorder.Controller.PlaybackSpeed = event.target.value;
            });
        }

        public GetLastChange(): DOMChange {
            if (this.Changes.length > 0) {
                return this.Changes[this.Changes.length - 1];
            }
            return null;
        }

        ControlID: number = 0;
        SessionID: number = 0;
        WatchAreaRootElement: Element;
        Recorder: DOMRecorder;
        Player: DOMPlayer;
        Changes: Array<DOMChange>;
        PlaybackSpeed: number = 1;

        PageMode: PageMode;
        PlaybackAvailable: boolean;
    }

    export var Controller: PageRecorder.PageController;
}

//
// OnLoad would be too late for a full screen capture, but serves 
// the purpose for capturing an on demand record session...
// I know FullStory loads as a deferred async include in the <head>
// likely to capture a minimal DOM and track change events earlier so
// the session doesn't start after fully loaded...
//

$(function () {
    PageRecorder.Controller = new PageRecorder.PageController();
});

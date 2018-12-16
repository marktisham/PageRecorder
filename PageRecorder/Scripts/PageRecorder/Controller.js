/// <reference path="../typings/jquery/jquery.d.ts" />
//
// Primary controller to drive client side actions on the recorder page
//
var PageRecorder;
(function (PageRecorder) {
    var PageMode;
    (function (PageMode) {
        PageMode[PageMode["Playback"] = 0] = "Playback";
        PageMode[PageMode["Recording"] = 1] = "Recording";
        PageMode[PageMode["Stopped"] = 2] = "Stopped";
    })(PageMode = PageRecorder.PageMode || (PageRecorder.PageMode = {}));
    var PageController = /** @class */ (function () {
        function PageController() {
            this.ControlID = 0;
            this.SessionID = 0;
            this.PlaybackSpeed = 1;
            this.WatchAreaRootElement = document.getElementById("dom_watch_area");
            this.Recorder = new PageRecorder.DOMRecorder();
            this.Player = new PageRecorder.DOMPlayer();
            this.AddPanel(this.WatchAreaRootElement);
            this.PlaybackAvailable = false;
            this.SetPageMode(PageMode.Stopped);
            this.InitPlaybackSpeedHandler();
        }
        //
        // Page Mode State Management
        //
        PageController.prototype.SetPageMode = function (mode) {
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
        };
        PageController.prototype.SetPageModeRecording = function () {
            this.SetWatchAreaDisabled(false);
            this.SetRootCommandsDisabled(false);
            this.SetRecordButtonDisabled(true);
            this.SetStopButtonDisabled(false);
            this.SetPlayButtonDisabled(true);
            this.SetPlaySpeedDisabled(true);
        };
        PageController.prototype.SetPageModeStopped = function () {
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
        };
        PageController.prototype.SetPageModePlayback = function () {
            this.SetWatchAreaDisabled(false);
            this.SetRootCommandsDisabled(true);
            this.SetRecordButtonDisabled(true);
            this.SetStopButtonDisabled(false);
            this.SetPlayButtonDisabled(true);
            this.SetPlaySpeedDisabled(false);
        };
        PageController.prototype.SetRecordButtonDisabled = function (disabled) {
            var elem = document.getElementById("recordbutton");
            this.SetElementDisabled(elem, disabled);
        };
        PageController.prototype.SetStopButtonDisabled = function (disabled) {
            var elem = document.getElementById("stopbutton");
            this.SetElementDisabled(elem, disabled);
        };
        PageController.prototype.SetPlayButtonDisabled = function (disabled) {
            var elem = document.getElementById("replaybutton");
            this.SetElementDisabled(elem, disabled);
            elem.classList.remove("btn-default");
            elem.classList.remove("btn-success");
            if (this.PlaybackAvailable) {
                elem.classList.add("btn-success");
            }
            else {
                elem.classList.add("btn-default");
            }
        };
        PageController.prototype.SetPlaySpeedDisabled = function (disabled) {
            var elem = document.getElementById("playback-speed");
            this.SetElementDisabled(elem, disabled);
        };
        PageController.prototype.SetRootCommandsDisabled = function (disabled) {
            var rootCommands = document.getElementById("root_commands");
            this.SetElementsDisabled(rootCommands.querySelectorAll("button"), disabled);
        };
        PageController.prototype.SetWatchAreaDisabled = function (disabled) {
            this.SetElementsDisabled(this.WatchAreaRootElement.querySelectorAll("button"), disabled);
            this.SetElementsDisabled(this.WatchAreaRootElement.querySelectorAll("input"), disabled);
            this.SetElementsDisabled(this.WatchAreaRootElement.querySelectorAll("select"), disabled);
        };
        PageController.prototype.SetElementDisabled = function (elem, disabled) {
            if (disabled) {
                elem.setAttribute("disabled", "true");
            }
            else {
                elem.removeAttribute("disabled");
            }
        };
        PageController.prototype.SetElementsDisabled = function (elems, disabled) {
            if (disabled) {
                for (var i = 0; i < elems.length; ++i) {
                    var elem = elems[i];
                    elem.setAttribute("disabled", "true");
                }
            }
            else {
                for (var i = 0; i < elems.length; ++i) {
                    var elem = elems[i];
                    elem.removeAttribute("disabled");
                }
            }
        };
        //
        // Timer Status
        //
        PageController.prototype.SetTimerStatus = function (msg) {
            var elem = document.getElementById("timer_status");
            elem.textContent = msg;
        };
        PageController.prototype.AppendTimerStatus = function (msg) {
            var elem = document.getElementById("timer_status");
            elem.textContent = elem.textContent + msg;
        };
        //
        // Button Actions
        //
        PageController.prototype.Record = function () {
            // Post current contents of the watch area as a starting point
            this.SetPageMode(PageMode.Recording);
            var watchAreaHTML = this.WatchAreaRootElement.innerHTML;
            watchAreaHTML = PageRecorder.htmlEncode(watchAreaHTML);
            $.ajax({
                method: "POST",
                url: "/Home/Record",
                data: {
                    InitialDOM: watchAreaHTML
                }
            }).done(function (response) {
                PageRecorder.Controller.SessionID = response;
                // Start recording changes
                PageRecorder.Controller.Recorder.StartRecording(PageRecorder.Controller.WatchAreaRootElement);
            }).fail(function (response) {
                alert(response.status + " " + response.statusText + ":\n\n" + response.responseText);
            });
        };
        PageController.prototype.Stop = function () {
            PageRecorder.Controller.Recorder.StopRecording();
            PageRecorder.Controller.Player.StopPlayback();
            // Change state after recording stopped, else state change is captured by recording
            this.SetPageMode(PageMode.Stopped);
        };
        PageController.prototype.Play = function () {
            this.SetPageMode(PageMode.Playback);
            var getURL = "/Home/Playback?SessionID=" + this.SessionID;
            $.ajax({
                method: "GET",
                url: getURL
            }).done(function (response) {
                PageRecorder.Controller.WatchAreaRootElement.innerHTML = PageRecorder.htmlDecode(response);
                PageRecorder.Controller.Player.ReplayChanges();
            }).fail(function (response) {
                alert(response.status + " " + response.statusText + ":\n\n" + response.responseText);
            });
        };
        //
        // DOM Manipulators...
        //
        PageController.prototype.AddRootPanel = function () {
            this.AddPanel(this.WatchAreaRootElement);
        };
        PageController.prototype.AddChildPanel = function (parentID) {
            var panel = document.getElementById(parentID);
            var nesting = panel.getElementsByClassName("nesting")[0];
            this.AddPanel(nesting);
        };
        PageController.prototype.AddSiblingPanel = function (panelID) {
            var panel = document.getElementById(panelID);
            var panelParent = panel.parentElement;
            var panelNextSibling = this.GetSiblingPanel(panelID, true);
            this.AddPanel(panelParent, panelNextSibling);
        };
        PageController.prototype.MovePanel = function (panelID, moveNext) {
            var panel = document.getElementById(panelID);
            var panelSibling;
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
            var panelParent = panel.parentElement;
            panelParent.removeChild(panel);
            panelParent.insertBefore(panel, panelSibling);
        };
        PageController.prototype.GetSiblingPanel = function (panelID, next) {
            var panel = document.getElementById(panelID);
            var panelParent = panel.parentElement;
            var panelSibling = null;
            for (var i = 0; i < panelParent.children.length; ++i) {
                var panelChild = panelParent.children[i];
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
        };
        PageController.prototype.AddPanel = function (parent, insertBefore) {
            if (insertBefore === void 0) { insertBefore = null; }
            var controlID = ++this.ControlID;
            var panelID = "testpanel_" + controlID;
            // Boy this should really be a React component...
            var panelRoot = document.createElement("div");
            panelRoot.id = panelID;
            panelRoot.classList.add("panel");
            panelRoot.classList.add("panel-warning");
            panelRoot.classList.add("testpanel");
            var panelHeading = document.createElement("div");
            panelHeading.classList.add("panel-heading");
            panelRoot.appendChild(panelHeading);
            var buttonGroup = this.CreateButtonGroup();
            panelHeading.appendChild(buttonGroup);
            var button;
            var action;
            action = "PageRecorder.Controller.AddChildPanel('" + panelID + "');";
            button = this.CreateButton("fa-plus", "Add Child", action);
            buttonGroup.appendChild(button);
            action = "PageRecorder.Controller.AddSiblingPanel('" + panelID + "');";
            button = this.CreateButton("fa-copy", "Add Sibling", action);
            buttonGroup.appendChild(button);
            var buttonGroup = this.CreateButtonGroup();
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
            var buttonGroup = this.CreateButtonGroup();
            panelHeading.appendChild(buttonGroup);
            action = "PageRecorder.Controller.DeleteElement('" + panelID + "');";
            button = this.CreateButton("fa-trash", "Delete", action);
            buttonGroup.appendChild(button);
            var badgeDiv = document.createElement("div");
            var badge = document.createElement("span");
            badgeDiv.classList.add("panelnumber");
            badgeDiv.classList.add("badge");
            badgeDiv.classList.add("badge-success");
            badge.textContent = "Panel " + controlID;
            badgeDiv.appendChild(badge);
            panelHeading.appendChild(badgeDiv);
            var panelBody = document.createElement("div");
            panelBody.classList.add("panel-body");
            panelRoot.appendChild(panelBody);
            var input = document.createElement("input");
            input.classList.add("form-control");
            input.setAttribute("placeholder", "Type something...");
            input.setAttribute("value", "Panel " + controlID);
            panelBody.appendChild(input);
            var select = document.createElement("select");
            select.classList.add("form-control");
            panelBody.appendChild(select);
            var option = document.createElement("option");
            option.textContent = "Select Something...";
            option.setAttribute("value", "1");
            option.setAttribute("selected", "true");
            select.appendChild(option);
            option = document.createElement("option");
            option.textContent = "Second";
            option.setAttribute("value", "2");
            select.appendChild(option);
            option = document.createElement("option");
            option.textContent = "Third";
            option.setAttribute("value", "3");
            select.appendChild(option);
            option = document.createElement("option");
            option.textContent = "Fourth";
            option.setAttribute("value", "4");
            select.appendChild(option);
            // For new children...
            var nesting = document.createElement("div");
            nesting.classList.add("nesting");
            panelBody.appendChild(nesting);
            // Insert the whole shebang in one DOM change event
            if (insertBefore != null) {
                parent.insertBefore(panelRoot, insertBefore);
            }
            else {
                parent.appendChild(panelRoot);
            }
        };
        PageController.prototype.CreateButtonGroup = function () {
            var buttonGroup = document.createElement("div");
            buttonGroup.classList.add("btn-group");
            buttonGroup.setAttribute("role", "group");
            return buttonGroup;
        };
        PageController.prototype.CreateButton = function (iconClass, text, action) {
            var button = document.createElement("button");
            button.classList.add("btn");
            button.classList.add("btn-default");
            button.setAttribute("onclick", action);
            var iconElement = document.createElement("i");
            iconElement.classList.add("fa");
            iconElement.classList.add(iconClass);
            button.appendChild(iconElement);
            var textElement = document.createElement("span");
            textElement.textContent = text;
            button.appendChild(textElement);
            return button;
        };
        PageController.prototype.ChangeElement = function (domID) {
            var elem = document.getElementById(domID);
            for (var i = 0; i < elem.classList.length; ++i) {
                var classStr = elem.classList[i].toString();
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
        };
        PageController.prototype.DeleteElement = function (domID) {
            document.getElementById(domID).remove();
        };
        PageController.prototype.RemoveAllFromDOM = function () {
            for (var i = this.WatchAreaRootElement.children.length - 1; i >= 0; --i) {
                var childElem = this.WatchAreaRootElement.children[i];
                this.WatchAreaRootElement.removeChild(childElem);
            }
        };
        //
        // General Helpers
        //
        PageController.prototype.InitPlaybackSpeedHandler = function () {
            var speedElem = document.getElementById("playback-speed");
            speedElem.addEventListener("change", function (event) {
                PageRecorder.Controller.PlaybackSpeed = event.target.value;
            });
        };
        PageController.prototype.GetLastChange = function () {
            if (this.Changes.length > 0) {
                return this.Changes[this.Changes.length - 1];
            }
            return null;
        };
        return PageController;
    }());
    PageRecorder.PageController = PageController;
})(PageRecorder || (PageRecorder = {}));
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
//# sourceMappingURL=Controller.js.map
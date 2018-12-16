//
// Logic to record DOM change events and build a FIFO queue of DOMChange objects
// 
var PageRecorder;
(function (PageRecorder) {
    var DOMRecorder = /** @class */ (function () {
        function DOMRecorder() {
        }
        DOMRecorder.prototype.StartRecording = function (targetNode) {
            this.WatchRoot = targetNode;
            PageRecorder.Controller.Changes = new Array();
            // Options for the observer (which mutations to observe)
            var config = { attributes: true, childList: true, subtree: true };
            // Callback function to execute when mutations are observed
            var callback = function (mutationsList, observer) {
                for (var _i = 0, mutationsList_1 = mutationsList; _i < mutationsList_1.length; _i++) {
                    var mutation = mutationsList_1[_i];
                    PageRecorder.Controller.Recorder.WatchDOMChange(mutation);
                }
            };
            // Create an observer instance linked to the callback function
            this.Observer = new MutationObserver(callback);
            // Start observing the target node for configured mutations
            this.Observer.observe(targetNode, config);
            // Capture other changes not observed by MutationObserver
            this.AddEventListeners();
            this.StartTimer();
        };
        // Extract out a slim "need to know" package from the change event
        // for the sake of speed, memory and ease of serialization.
        // Also queue up for batched broadcast later
        DOMRecorder.prototype.WatchDOMChange = function (mutation) {
            var elapsedTime = Date.now() - PageRecorder.Controller.Recorder.StartTime;
            if (mutation.type == "childList") {
                var parentPath = PageRecorder.getDomPath(mutation.target);
                var prevSiblingPath = PageRecorder.getDomPath(mutation.previousSibling);
                var nextSiblingPath = PageRecorder.getDomPath(mutation.nextSibling);
                for (var i1 = 0; i1 < mutation.addedNodes.length; ++i1) {
                    var elem = mutation.addedNodes[i1];
                    var change = new PageRecorder.DOMChange();
                    change.Init(PageRecorder.DOMChangeType.AddChild, elem, parentPath, prevSiblingPath, nextSiblingPath, elapsedTime);
                    PageRecorder.Controller.Changes.push(change);
                }
                for (var i2 = 0; i2 < mutation.removedNodes.length; ++i2) {
                    var elem = mutation.removedNodes[i2];
                    var change = new PageRecorder.DOMChange();
                    change.Init(PageRecorder.DOMChangeType.RemoveChild, elem, parentPath, prevSiblingPath, nextSiblingPath, elapsedTime);
                    PageRecorder.Controller.Changes.push(change);
                }
                return;
            }
            if (mutation.type == "attributes") {
                var elem = mutation.target;
                var path = PageRecorder.getDomPath(elem);
                var change = new PageRecorder.DOMChange();
                change.Init(PageRecorder.DOMChangeType.UpdateAttributes, elem, path, null, null, elapsedTime);
                PageRecorder.Controller.Changes.push(change);
            }
            console.log("Unhandled mutation type: " + mutation.type);
        };
        DOMRecorder.prototype.AddEventListeners = function () {
            this.WatchRoot.addEventListener("keyup", PageRecorder.Controller.Recorder.WatchValueChange);
            this.WatchRoot.addEventListener("change", PageRecorder.Controller.Recorder.WatchValueChange);
            // TODO: no doubt need other listeners for other change types like
            // radio select, mouse move, etc...
        };
        DOMRecorder.prototype.RemoveEventListeners = function () {
            this.WatchRoot.removeEventListener("keyup", PageRecorder.Controller.Recorder.WatchValueChange);
            this.WatchRoot.removeEventListener("change", PageRecorder.Controller.Recorder.WatchValueChange);
        };
        DOMRecorder.prototype.WatchValueChange = function (event) {
            var path = PageRecorder.getDomPath(event.target);
            var elapsedTime = Date.now() - PageRecorder.Controller.Recorder.StartTime;
            var change = new PageRecorder.DOMChange();
            change.Init(PageRecorder.DOMChangeType.UpdateValue, event.target, path, null, null, elapsedTime);
            PageRecorder.Controller.Changes.push(change);
        };
        DOMRecorder.prototype.StopRecording = function () {
            if (this.Observer == null) {
                return;
            }
            // Flush out any final pending changes
            var mutationsList = this.Observer.takeRecords();
            if (mutationsList != null) {
                for (var _i = 0, mutationsList_2 = mutationsList; _i < mutationsList_2.length; _i++) {
                    var mutation = mutationsList_2[_i];
                    PageRecorder.Controller.Recorder.WatchDOMChange(mutation);
                }
            }
            this.Observer.disconnect();
            this.Observer = null;
            this.RemoveEventListeners();
            this.WatchRoot = null;
            if (PageRecorder.Controller.Changes.length == 0) {
                PageRecorder.Controller.PlaybackAvailable = false;
                PageRecorder.Controller.SetTimerStatus("Hit record, then change the DOM below.");
                return;
            }
            // Use the last frame for the completed record time, since that's how the playback will look
            var elapsedTime = PageRecorder.Controller.GetLastChange().ElapsedTime;
            PageRecorder.Controller.Recorder.SetTimerStatus(elapsedTime);
            PageRecorder.Controller.AppendTimerStatus(" (Complete)");
            PageRecorder.Controller.PlaybackAvailable = true;
        };
        DOMRecorder.prototype.StartTimer = function () {
            this.StartTime = Date.now();
            this.TimerCallback();
        };
        DOMRecorder.prototype.TimerCallback = function () {
            var recorder = PageRecorder.Controller.Recorder;
            if (!recorder.IsRecording()) {
                return;
            }
            var elapsedTime = Date.now() - recorder.StartTime;
            recorder.SetTimerStatus(elapsedTime);
            var waitTimeMS = 250;
            setTimeout(recorder.TimerCallback, waitTimeMS);
        };
        DOMRecorder.prototype.SetTimerStatus = function (elapsedTime) {
            elapsedTime /= 1000;
            elapsedTime = round_decimal(elapsedTime, 1);
            var msg = "Recording: " + elapsedTime + " s";
            PageRecorder.Controller.SetTimerStatus(msg);
        };
        DOMRecorder.prototype.IsRecording = function () {
            return (this.Observer != null);
        };
        return DOMRecorder;
    }());
    PageRecorder.DOMRecorder = DOMRecorder;
})(PageRecorder || (PageRecorder = {}));
//# sourceMappingURL=DOMRecorder.js.map
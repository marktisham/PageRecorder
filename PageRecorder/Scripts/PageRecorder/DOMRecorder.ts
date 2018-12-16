
//
// Logic to record DOM change events and build a FIFO queue of DOMChange objects
// 

namespace PageRecorder {

    // Imported Javascript functions (see Site.JS)
    declare function round_decimal(value: number, decimals: number): number;

    export class DOMRecorder {
        constructor() {
        }

        public StartRecording(targetNode: Element) {
            this.WatchRoot = targetNode;
            PageRecorder.Controller.Changes = new Array<DOMChange>();

            // Options for the observer (which mutations to observe)
            var config = { attributes: true, childList: true, subtree: true };

            // Callback function to execute when mutations are observed
            var callback = function (mutationsList, observer) {
                for (var mutation of mutationsList) {
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
        }

        // Extract out a slim "need to know" package from the change event
        // for the sake of speed, memory and ease of serialization.
        // Also queue up for batched broadcast later
        public WatchDOMChange(mutation: MutationRecord) {
            var elapsedTime: number = Date.now() - PageRecorder.Controller.Recorder.StartTime;

            if (mutation.type == "childList") {
                var parentPath: string = getDomPath(mutation.target);
                var prevSiblingPath: string = getDomPath(mutation.previousSibling);
                var nextSiblingPath: string = getDomPath(mutation.nextSibling);

                for (var i1 = 0; i1 < mutation.addedNodes.length; ++i1) {
                    var elem = mutation.addedNodes[i1];
                    var change: DOMChange = new PageRecorder.DOMChange();
                    change.Init(DOMChangeType.AddChild, elem, parentPath, prevSiblingPath, nextSiblingPath, elapsedTime);
                    PageRecorder.Controller.Changes.push(change);
                }
                for (var i2 = 0; i2 < mutation.removedNodes.length; ++i2) {
                    var elem = mutation.removedNodes[i2];
                    var change: DOMChange = new PageRecorder.DOMChange();
                    change.Init(DOMChangeType.RemoveChild, elem, parentPath, prevSiblingPath, nextSiblingPath, elapsedTime);
                    PageRecorder.Controller.Changes.push(change);
                }
                return;
            }
            if (mutation.type == "attributes") {
                var elem = mutation.target;
                var path: string = getDomPath(elem);
                var change: DOMChange = new PageRecorder.DOMChange();
                change.Init(DOMChangeType.UpdateAttributes, elem, path, null, null, elapsedTime);
                PageRecorder.Controller.Changes.push(change);
            }

            console.log("Unhandled mutation type: " + mutation.type);
        }

        public AddEventListeners(): void {
            this.WatchRoot.addEventListener("keyup", PageRecorder.Controller.Recorder.WatchValueChange);
            this.WatchRoot.addEventListener("change", PageRecorder.Controller.Recorder.WatchValueChange);

            // TODO: no doubt need other listeners for other change types like
            // radio select, mouse move, etc...
        }

        public RemoveEventListeners(): void {
            this.WatchRoot.removeEventListener("keyup", PageRecorder.Controller.Recorder.WatchValueChange);
            this.WatchRoot.removeEventListener("change", PageRecorder.Controller.Recorder.WatchValueChange);
        }

        public WatchValueChange(event: any) {
            var path: string = getDomPath(event.target);
            var elapsedTime: number = Date.now() - PageRecorder.Controller.Recorder.StartTime;

            var change: DOMChange = new PageRecorder.DOMChange();
            change.Init(DOMChangeType.UpdateValue, event.target, path, null, null, elapsedTime);
            PageRecorder.Controller.Changes.push(change);
        }

        public StopRecording() {
            if (this.Observer == null) {
                return;
            }

            // Flush out any final pending changes
            var mutationsList = this.Observer.takeRecords();
            if (mutationsList != null) {
                for (var mutation of mutationsList) {
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
            var elapsedTime: number = PageRecorder.Controller.GetLastChange().ElapsedTime;
            PageRecorder.Controller.Recorder.SetTimerStatus(elapsedTime);
            PageRecorder.Controller.AppendTimerStatus(" (Complete)");

            PageRecorder.Controller.PlaybackAvailable = true;
        }

        public StartTimer(): void {
            this.StartTime = Date.now();
            this.TimerCallback();
        }

        public TimerCallback(): void {
            var recorder: DOMRecorder = PageRecorder.Controller.Recorder;
            if (!recorder.IsRecording()) {
                return;
            }

            var elapsedTime: number = Date.now() - recorder.StartTime;
            recorder.SetTimerStatus(elapsedTime);

            const waitTimeMS: Number = 250;
            setTimeout(recorder.TimerCallback, waitTimeMS);
        }

        public SetTimerStatus(elapsedTime: number) {
            elapsedTime /= 1000;
            elapsedTime = round_decimal(elapsedTime, 1);
            var msg: string = "Recording: " + elapsedTime + " s";
            PageRecorder.Controller.SetTimerStatus(msg);
        }

        public IsRecording(): boolean {
            return (this.Observer != null);
        }

        public StartTime: number;

        Observer: MutationObserver;
        WatchRoot: Element;
    }
}




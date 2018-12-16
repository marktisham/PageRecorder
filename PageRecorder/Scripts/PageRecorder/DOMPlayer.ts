/// <reference path="../typings/jquery/jquery.d.ts" />

//
// Logic to play back the queue of DOMChange events captured by DOMRecorder
// 

namespace PageRecorder {

    // Imported Javascript functions (see Site.JS)
    declare function round_decimal(value: number, decimals: number): number;

    export class DOMPlayer {
        constructor() {
        }

        public ReplayChanges() {
            this.CurrentFrameIndex = 0;
            this.PlaybackStopped = false;
            this.InitPlaybackElapsedTime();
            this.PlayNextFrame();
        }

        public StopPlayback() {
            this.PlaybackStopped = true;
        }

        public PlayNextFrame() {
            var player: DOMPlayer = PageRecorder.Controller.Player; // don't use "this" in callbacks
            if (player.PlaybackStopped) {
                return;
            }

            var currentIndex: number = player.CurrentFrameIndex;

            // Stop playback if out of frames
            if (currentIndex >= Controller.Changes.length) {
                player.FinalizeReplay();
                return;
            }

            var frame: DOMChange = Controller.Changes[currentIndex];
            player.UpdatePlaybackElapsedTime(frame);

            // Not time yet for this frame? Come back later
            if (frame.ElapsedTime > player.PlaybackElapsedTime) {
                const waitTimeMS: Number = 200;
                setTimeout(player.PlayNextFrame, waitTimeMS);       
                return;
            }

            // Ready to play this frame
            player.PlayFrame(frame);

            // And immediately try the next one
            ++player.CurrentFrameIndex;
            setTimeout(player.PlayNextFrame, 0);
        }

        public PlayFrame(frame: DOMChange) : void {     
            switch (frame.ChangeType) {
                case DOMChangeType.AddChild:
                    PageRecorder.Controller.Player.PlayFrameAddChild(frame);
                    return;
                case DOMChangeType.RemoveChild:
                    PageRecorder.Controller.Player.PlayFrameRemoveChild(frame);
                    return;
                case DOMChangeType.UpdateValue:
                    PageRecorder.Controller.Player.PlayFrameUpdateValue(frame);
                    return;
                case DOMChangeType.UpdateAttributes:
                    PageRecorder.Controller.Player.PlayFrameUpdateAttributes(frame);
                    return;
                default:
                    throw new Error("Unsupported DOMChangeType for replay");
            }
        }

        PlayFrameAddChild(frame: DOMChange) : void {
            var parent: Element = $(frame.ParentPath)[0];
            if (parent == null) {
                throw new Error("Parent not found at " + frame.ParentPath);
            }

            var nextSibling: Element = null;
            if (frame.NextSiblingPath != null && frame.NextSiblingPath.length > 0) {
                nextSibling = $(frame.NextSiblingPath)[0];
            }
            var newChild = frame.CreateElementFromValues();

            if (nextSibling != null) {
                parent.insertBefore(newChild, nextSibling);
            }
            else {
                parent.appendChild(newChild);
            }
        }

        PlayFrameRemoveChild(frame: DOMChange) : void {
            var parent: Element = $(frame.ParentPath)[0];
            if (parent == null) {
                throw new Error("Parent not found at " + frame.ParentPath);
            }

            var prevSibling: Element = null;
            if (frame.PreviousSiblingPath != null && frame.PreviousSiblingPath.length > 0) {
                prevSibling = $(frame.PreviousSiblingPath)[0];
            }           

            var nextSibling: Element = null;
            if (frame.NextSiblingPath != null && frame.NextSiblingPath.length > 0) {
                nextSibling = $(frame.PreviousSiblingPath)[0];
            }

            // Find the element to remove by looping through the existing children
            // and looking for a sibling match
            var childCount: number = parent.children.length;
            for (var i = 0; i < childCount; ++i) {
                var elem: Element = parent.children[i];
                if (prevSibling == null) {
                    if (i != 0) {
                        console.log("Invalid DOM remove scenario: Previous sibling null but not at start of list.");
                        return;
                    }
                    elem.remove();
                    return;
                }
                if (prevSibling == elem) {
                    if (i == childCount - 1) {
                        console.log("Invalid DOM remove scenario: Previous sibling was at end of list.");
                        return;
                    }
                    parent.children[i + 1].remove();
                    return;
                }
            }
            console.log("Invalid DOM remove scenario: Could not find element to remove.");
        }

        PlayFrameUpdateValue(frame: DOMChange): void {
            var elem: any = $(frame.ParentPath)[0];
            if (elem == null) {
                throw new Error("Element not found at " + frame.ParentPath);
            }

            // (Need to cast to Element type from Node to access value property)
            elem.value = frame.value;
        }

        PlayFrameUpdateAttributes(frame: DOMChange): void {
            var elem: any = $(frame.ParentPath)[0];
            if (elem == null) {
                throw new Error("Element not found at " + frame.ParentPath);
            }
            frame.UpdateElemValues(elem);
        }

        public FinalizeReplay() {
            PageRecorder.Controller.SetPageMode(PageMode.Stopped);
            PageRecorder.Controller.AppendTimerStatus(" (Complete)");
        }

        //
        // Playback Timer
        //

        InitPlaybackElapsedTime() {
            this.PlaybackElapsedTime = 0;
            this.TimeLastCheck = Date.now();
            this.PlaybackTotalTime = PageRecorder.Controller.GetLastChange().ElapsedTime;

            var elapsedTimeInSeconds = this.PlaybackTotalTime / 1000;
            elapsedTimeInSeconds = round_decimal(elapsedTimeInSeconds, 2);
            this.PlaybackTotalTimeFormatted=elapsedTimeInSeconds + " s";    
        }

        UpdatePlaybackElapsedTime(frame: DOMChange): void {
            var now: number = Date.now();
            var realTimeSinceLastCheck: number = now - this.TimeLastCheck;
            this.TimeLastCheck = now;

            var playbackSpeed: number = PageRecorder.Controller.PlaybackSpeed;
            var playbackTimeSinceLastCheck: number = realTimeSinceLastCheck * playbackSpeed;
            this.PlaybackElapsedTime += playbackTimeSinceLastCheck;

            // Event timing somewhat imprecise, round to the frame timings
            // to better synchronize with the UI
            if (this.PlaybackElapsedTime > frame.ElapsedTime) {
                this.PlaybackElapsedTime = frame.ElapsedTime;
            }

            var elapsedTimeInSeconds = this.PlaybackElapsedTime / 1000;
            elapsedTimeInSeconds = round_decimal(elapsedTimeInSeconds, 2);
            var msg: string = "Playback: " + elapsedTimeInSeconds + " s"; 
            msg += " of " + this.PlaybackTotalTimeFormatted;
            PageRecorder.Controller.SetTimerStatus(msg);
        }

        //
        // Implementation Variables
        //

        PlaybackElapsedTime: number;    // taking into account playback speed
        TimeLastCheck: number;          // in real time
        PlaybackTotalTime: number;
        PlaybackTotalTimeFormatted: string;
        CurrentFrameIndex: number;
        PlaybackStopped: boolean;
    }
}
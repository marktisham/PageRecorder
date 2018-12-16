/// <reference path="../typings/jquery/jquery.d.ts" />
//
// Logic to play back the queue of DOMChange events captured by DOMRecorder
// 
var PageRecorder;
(function (PageRecorder) {
    var DOMPlayer = /** @class */ (function () {
        function DOMPlayer() {
        }
        DOMPlayer.prototype.ReplayChanges = function () {
            this.CurrentFrameIndex = 0;
            this.PlaybackStopped = false;
            this.InitPlaybackElapsedTime();
            this.PlayNextFrame();
        };
        DOMPlayer.prototype.StopPlayback = function () {
            this.PlaybackStopped = true;
        };
        DOMPlayer.prototype.PlayNextFrame = function () {
            var player = PageRecorder.Controller.Player; // don't use "this" in callbacks
            if (player.PlaybackStopped) {
                return;
            }
            var currentIndex = player.CurrentFrameIndex;
            // Stop playback if out of frames
            if (currentIndex >= PageRecorder.Controller.Changes.length) {
                player.FinalizeReplay();
                return;
            }
            var frame = PageRecorder.Controller.Changes[currentIndex];
            player.UpdatePlaybackElapsedTime(frame);
            // Not time yet for this frame? Come back later
            if (frame.ElapsedTime > player.PlaybackElapsedTime) {
                var waitTimeMS = 200;
                setTimeout(player.PlayNextFrame, waitTimeMS);
                return;
            }
            // Ready to play this frame
            player.PlayFrame(frame);
            // And immediately try the next one
            ++player.CurrentFrameIndex;
            setTimeout(player.PlayNextFrame, 0);
        };
        DOMPlayer.prototype.PlayFrame = function (frame) {
            switch (frame.ChangeType) {
                case PageRecorder.DOMChangeType.AddChild:
                    PageRecorder.Controller.Player.PlayFrameAddChild(frame);
                    return;
                case PageRecorder.DOMChangeType.RemoveChild:
                    PageRecorder.Controller.Player.PlayFrameRemoveChild(frame);
                    return;
                case PageRecorder.DOMChangeType.UpdateValue:
                    PageRecorder.Controller.Player.PlayFrameUpdateValue(frame);
                    return;
                case PageRecorder.DOMChangeType.UpdateAttributes:
                    PageRecorder.Controller.Player.PlayFrameUpdateAttributes(frame);
                    return;
                default:
                    throw new Error("Unsupported DOMChangeType for replay");
            }
        };
        DOMPlayer.prototype.PlayFrameAddChild = function (frame) {
            var parent = $(frame.ParentPath)[0];
            if (parent == null) {
                throw new Error("Parent not found at " + frame.ParentPath);
            }
            var nextSibling = null;
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
        };
        DOMPlayer.prototype.PlayFrameRemoveChild = function (frame) {
            var parent = $(frame.ParentPath)[0];
            if (parent == null) {
                throw new Error("Parent not found at " + frame.ParentPath);
            }
            var prevSibling = null;
            if (frame.PreviousSiblingPath != null && frame.PreviousSiblingPath.length > 0) {
                prevSibling = $(frame.PreviousSiblingPath)[0];
            }
            var nextSibling = null;
            if (frame.NextSiblingPath != null && frame.NextSiblingPath.length > 0) {
                nextSibling = $(frame.PreviousSiblingPath)[0];
            }
            // Find the element to remove by looping through the existing children
            // and looking for a sibling match
            var childCount = parent.children.length;
            for (var i = 0; i < childCount; ++i) {
                var elem = parent.children[i];
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
        };
        DOMPlayer.prototype.PlayFrameUpdateValue = function (frame) {
            var elem = $(frame.ParentPath)[0];
            if (elem == null) {
                throw new Error("Element not found at " + frame.ParentPath);
            }
            // (Need to cast to Element type from Node to access value property)
            elem.value = frame.value;
        };
        DOMPlayer.prototype.PlayFrameUpdateAttributes = function (frame) {
            var elem = $(frame.ParentPath)[0];
            if (elem == null) {
                throw new Error("Element not found at " + frame.ParentPath);
            }
            frame.UpdateElemValues(elem);
        };
        DOMPlayer.prototype.FinalizeReplay = function () {
            PageRecorder.Controller.SetPageMode(PageRecorder.PageMode.Stopped);
            PageRecorder.Controller.AppendTimerStatus(" (Complete)");
        };
        //
        // Playback Timer
        //
        DOMPlayer.prototype.InitPlaybackElapsedTime = function () {
            this.PlaybackElapsedTime = 0;
            this.TimeLastCheck = Date.now();
            this.PlaybackTotalTime = PageRecorder.Controller.GetLastChange().ElapsedTime;
            var elapsedTimeInSeconds = this.PlaybackTotalTime / 1000;
            elapsedTimeInSeconds = round_decimal(elapsedTimeInSeconds, 2);
            this.PlaybackTotalTimeFormatted = elapsedTimeInSeconds + " s";
        };
        DOMPlayer.prototype.UpdatePlaybackElapsedTime = function (frame) {
            var now = Date.now();
            var realTimeSinceLastCheck = now - this.TimeLastCheck;
            this.TimeLastCheck = now;
            var playbackSpeed = PageRecorder.Controller.PlaybackSpeed;
            var playbackTimeSinceLastCheck = realTimeSinceLastCheck * playbackSpeed;
            this.PlaybackElapsedTime += playbackTimeSinceLastCheck;
            // Event timing somewhat imprecise, round to the frame timings
            // to better synchronize with the UI
            if (this.PlaybackElapsedTime > frame.ElapsedTime) {
                this.PlaybackElapsedTime = frame.ElapsedTime;
            }
            var elapsedTimeInSeconds = this.PlaybackElapsedTime / 1000;
            elapsedTimeInSeconds = round_decimal(elapsedTimeInSeconds, 2);
            var msg = "Playback: " + elapsedTimeInSeconds + " s";
            msg += " of " + this.PlaybackTotalTimeFormatted;
            PageRecorder.Controller.SetTimerStatus(msg);
        };
        return DOMPlayer;
    }());
    PageRecorder.DOMPlayer = DOMPlayer;
})(PageRecorder || (PageRecorder = {}));
//# sourceMappingURL=DOMPlayer.js.map
//
// General purpose helpers
//
var PageRecorder;
(function (PageRecorder) {
    // See http://www.codeproject.com/Articles/667335/Client-side-HTML-Encode-and-Decode-functions-with
    function htmlEncode(value) {
        return $('<div/>').text(value).html();
    }
    PageRecorder.htmlEncode = htmlEncode;
    function htmlDecode(value) {
        return $('<div/>').html(value).text();
    }
    PageRecorder.htmlDecode = htmlDecode;
    // https://stackoverflow.com/questions/5728558/get-the-dom-path-of-the-clicked-a
    // MTI Optimization todo: don't need to go up the full parent tree necessarily,
    // can stop on the first ancestor that has an ID attribute (if any)...
    // Note 2: this returns a jquery format selector (e.g. the "eq"), ideally
    // convert to pure JS
    function getDomPath(el) {
        if (el == null) {
            return null;
        }
        var stack = [];
        while (el.parentNode != null) {
            var sibCount = 0;
            var sibIndex = 0;
            for (var i = 0; i < el.parentNode.childNodes.length; i++) {
                var sib = el.parentNode.childNodes[i];
                if (sib.nodeName == el.nodeName) {
                    if (sib === el) {
                        sibIndex = sibCount;
                    }
                    sibCount++;
                }
            }
            if (el.hasAttribute != null && el.hasAttribute('id') && el.id != '') {
                stack.unshift(el.nodeName.toLowerCase() + '#' + el.id);
            }
            else if (sibCount > 1) {
                stack.unshift(el.nodeName.toLowerCase() + ':eq(' + sibIndex + ')');
            }
            else {
                stack.unshift(el.nodeName.toLowerCase());
            }
            el = el.parentNode;
        }
        stack = stack.slice(1); // removes the html element
        return stack.join(" > ");
    }
    PageRecorder.getDomPath = getDomPath;
})(PageRecorder || (PageRecorder = {}));
//# sourceMappingURL=Helpers.js.map
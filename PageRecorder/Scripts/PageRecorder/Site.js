
//
// General purpose helpers that don't play well with TypeScript
//

// http://www.jacklmoore.com/notes/rounding-in-javascript/
function round_decimal(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}
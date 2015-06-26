(function () {
    'use strict';



    var AT_SERVER = (typeof module !== 'undefined' && module.exports);
    var AT_CLIENT = !AT_SERVER;

    var PIECES = [
        // 1: 1x1
        {t:1, f:4, p:[[0,0]]},
        // 2: 2x1
        {t:2, f:2, p:[[0,0], [0,1]]},
        {t:2, f:2, p:[[0,0], [1,0]]},
        // 3: 3x1
        {t:3, f:2, p:[[0,0], [1,0], [2,0]]},
        {t:3, f:2, p:[[0,0], [0,1], [0,2]]},
        // 4: 2x2 L
        {t:4, f:1, p:[[0,0], [0,1], [1,0]]},
        {t:4, f:1, p:[[0,0], [1,0], [1,1]]},
        {t:4, f:1, p:[[0,1], [1,0], [1,1]]},
        {t:4, f:1, p:[[0,0], [0,1], [1,1]]},
        // 5: 4x1
        {t:5, f:2, p:[[0,0], [0,1], [0,2], [0,3]]},
        {t:5, f:2, p:[[0,0], [1,0], [2,0], [3,0]]},
        // 6: 2x2 square
        {t:6, f:4, p:[[0,0], [0,1], [1,0], [1,1]]},
        // 7: 5x1
        {t:7, f:2, p:[[0,0], [0,1], [0,2], [0,3], [0,4]]},
        {t:7, f:2, p:[[0,0], [1,0], [2,0], [3,0], [4,0]]},
        // 8: 3x3 square
        {t:8, f:4, p:[[0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]]},
        // 9: 3x3 L
        {t:9, f:1, p:[[2,0], [1,0], [0,0], [0,1], [0,2]]},
        {t:9, f:1, p:[[0,0], [1,0], [2,0], [2,1], [2,2]]},
        {t:9, f:1, p:[[0,0], [0,1], [0,2], [1,2], [2,2]]},
        {t:9, f:1, p:[[2,0], [2,1], [2,2], [1,2], [0,2]]}
    ];

    PIECES.forEach(function(p, index) { // compute piece dims
        p.i = index;
        var dims = [0, 0];
        p.p.forEach(function(pos) {
            if (pos[0] > dims[0]) { dims[0] = pos[0]; }
            if (pos[1] > dims[1]) { dims[1] = pos[1]; }
        });
        p.dims = [dims[0]+1, dims[1]+1];
    });

    var TOTAL_ODDS = PIECES.reduce(function(prev, curr) { // calc total odds
        return prev + curr.f;
    }, 0);



    var noop = function() {};



    var seq = function(n){
        var arr = new Array(n);
        for (var i = 0; i < n; ++i) {
            arr[i] = i;
        }
        return arr;
    };



    var forVK = function(arr, fn) {
        for (var k in arr) {
            fn(arr[k], k);
        }
    };



    var posFormatter = function(o) {
        return o.join(',');
    };



    var uniques = function(arr, formatter) {
        var o = {};
        arr.forEach(function(item) {
            o[ formatter(item) ] = item;
        });
        var arr2 = [];
        forVK(o, function(v) {
            arr2.push(v);
        });
        return arr2;
    };



    var mergeArrays = function(arr) {
        var arr2 = [];
        for (var i = 0, I = arr.length; i < I; ++i) {
            arr2 = arr2.concat(arr[i]);
        }
        return arr2;
    };



    var mtx = function(w, h) {
        var arr = new Array(w*h);
        return {
            get: function(x, y) {
                return arr[y*w + x];
            },
            set: function(x, y, v) {
                arr[y*w + x] = v;
            }
        };
    };



    var rnd = function(n) {
        return ~~(Math.random() * n);
    };



    var rndPiece = function() {
        var i = rnd(TOTAL_ODDS);
        var p, accum = 0;
        for (var idx = 0; ; ++idx) {
            p = PIECES[idx];
            accum += p.f;
            if (i < accum) {
                return p;
            }
        }
    };



    var doesPieceFit = function(p, pos, m) {
        for (var i = 0, I = p.p.length, pp, x, y, v; i < I; ++i) {
            pp = p.p[i];
            x = pos[0] + pp[0];
            y = pos[1] + pp[1];
            if (x < 0 || y < 0 || x > 9 || y > 9) { return false; }
            v = m.get(x, y);
            if (v.v !== 0) { return false; }
        }
        return true;
    };



    var findLines = function(m) {
        var lines = [];
        seq(2).forEach(function(axis) {
            seq(10).forEach(function(i) {
                var line = [];
                var wasLine = seq(10).every(function(j) {
                    var x = (axis === 0) ? i : j;
                    var y = (axis === 1) ? i : j;
                    var filled = m.get(x, y).v !== 0;
                    if (filled) {
                        line.push([x, y]);
                    }
                    return filled;
                });
                if (wasLine) {
                    lines.push(line);
                }
            });
        });
        return lines;
    };



    var isGameOver = function(piecesInSlots, m) {
        return piecesInSlots.every(function(p) {
            if (!p) { return true; }
            return seq(10).every(function(y) {
                return seq(10).every(function(x) {
                    return !doesPieceFit(p, [x, y], m);
                });
            });
        });
    };



    var setPiece = function(p, delta, m) {
        p.p.forEach(function(pos) {
            var o = m.get(pos[0] + delta[0], pos[1] + delta[1]);
            if ('r' in o) { // client-side only
                o.r.attr('class', 'fill-' + p.t);
            }
            o.v = p.t;
        });
    };



    var initialState = function() {
        var m = mtx(10, 10);
        seq(10).forEach(function(y) {
            seq(10).forEach(function(x) {
                m.set(x, y, {v:0});
            });
        });

        var piecesInSlots = seq(3).map(function() {
            return rndPiece();
        });

        return {
            m: m,
            slots: piecesInSlots,
            score: 0,
            step: 0
        }
    };



    var playPiece = function(slotNr, pos, state) {
        var piecesInSlots = state.slots;
        var m = state.m;

        var p = piecesInSlots[slotNr];

        if (!p) {
            return {err:'no piece found'};
        }

        var didItFit = doesPieceFit(p, pos, m);

        if (didItFit) { // it does -> setPiece
            state.score += p.p.length;

            setPiece(p, pos, m);
            piecesInSlots[slotNr] = undefined;

            if (!piecesInSlots[0] && !piecesInSlots[1] && !piecesInSlots[2]) {
                piecesInSlots[0] = rndPiece();
                piecesInSlots[1] = rndPiece();
                piecesInSlots[2] = rndPiece();
            }

            var lines = findLines(m);

            if (lines.length > 0) { // lines occurred -> find positions and animate then to gray
                var positions = mergeArrays(lines);
                positions = uniques(positions, posFormatter);

                state.score += positions.length;

                positions.forEach(function (pos) {
                    var v = m.get(pos[0], pos[1]);
                    v.v = 0;
                    if ('r' in v) {
                        v.r.attr('class', 'fill-0');
                    }
                });
            }

            ++state.step;

            return isGameOver(piecesInSlots, m);
        }
        else { // it did not fit
            return {err:'piece did not fit'};
        }
    };



    var renderPiece = function(p) {
        var lines = seq(p.dims[1]).map(function() {
            return new Array( p.dims[0]+1).join(' ');
        });
        p.p.forEach(function(pos) {
            var arr = lines[ pos[1] ].split('');
            arr[ pos[0] ] = 'x';
            lines[ pos[1] ] = arr.join('');
        });
        return lines.join('\n');
    };



    var renderMatrix = function(m) {
        return seq(10).map(function(y) {
            return seq(10).map(function(x) {
                return m.get(x, y).v;
            }).join('');
        }).join('\n');
    };



    var renderState = function(st) {
        return [
            'score: ' + st.score,
            'step:  ' + st.step,
            '\nm:',
            renderMatrix(st.m),
            (st.slots[0] ? ('\nslot #0 (' + st.slots[0].i + '):\n' + renderPiece(st.slots[0])) : ''),
            (st.slots[1] ? ('\nslot #1 (' + st.slots[1].i + '):\n' + renderPiece(st.slots[1])) : ''),
            (st.slots[2] ? ('\nslot #2 (' + st.slots[2].i + '):\n' + renderPiece(st.slots[2])) : '')
        ].join('\n');
    };



    // export

    var modName = 'common';

    var mod = {
        seq: seq,
        initialState: initialState,
        playPiece: playPiece,
        renderPiece: renderPiece,
        renderMatrix: renderMatrix,
        renderState: renderState
    };

    if (AT_SERVER) { module.exports = mod; }
    else {           this[modName]  = mod; }

}.call(this));
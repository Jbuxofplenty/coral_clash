const { CoralClash, applyFixture } = require('./game/index.js');
const whaleCheck2 = require('./game/__fixtures__/whale-check-2.json');
const whaleCheck4 = require('./game/__fixtures__/whale-check-4.json');

console.log('=== WHALE-CHECK-2 ANALYSIS ===');
const game2 = new CoralClash();
applyFixture(game2, whaleCheck2);

console.log('White whale:', game2.whalePositions().w);  // b4, c4
console.log('Black whale:', game2.whalePositions().b);  // e7, e6
console.log('Turn:', game2.turn());  // b (black's turn)

console.log('\nTest expects: Black CANNOT move from e7,e6 to e5,e4');
console.log('Reason: Would be in check from white whale');

// Check if e5 or e4 are protected by black pieces
console.log('\nChecking if e5/e4 are protected BY BLACK:');
console.log('Can black attack e5?', game2.isAttacked('e5', 'b'));
console.log('Can black attack e4?', game2.isAttacked('e4', 'b'));

// Check if white can attack e5 or e4
console.log('\nChecking if white CAN attack e5/e4:');
console.log('Can white attack e5?', game2.isAttacked('e5', 'w'));
console.log('Can white attack e4?', game2.isAttacked('e4', 'w'));

// List black pieces that could protect
console.log('\nBlack pieces that might protect e5/e4:');
game2.board().flat().filter(p => p?.color === 'b' && p.type !== 'h').forEach(p => {
    console.log(`  ${p.square}: ${p.type} (${p.role})`);
});

console.log('\n\n=== WHALE-CHECK-4 ANALYSIS ===');
const game4 = new CoralClash();
applyFixture(game4, whaleCheck4);

console.log('White whale:', game4.whalePositions().w);  // d2, e2
console.log('Black whale:', game4.whalePositions().b);  // e6, e5
console.log('Turn:', game4.turn());  // w (white's turn)

console.log('\nTest expects: White CANNOT move from d2,e2 to d3,e3');
console.log('Reason: Would be in check from black whale');

// Check if d3 or e3 are protected by black pieces
console.log('\nChecking if d3/e3 are protected BY BLACK:');
console.log('Can black attack d3?', game4.isAttacked('d3', 'b'));
console.log('Can black attack e3?', game4.isAttacked('e3', 'b'));

// Check if black can attack d3 or e3
console.log('\nChecking if black whale CAN attack d3/e3:');
console.log('Can black attack d3?', game4.isAttacked('d3', 'b'));
console.log('Can black attack e3?', game4.isAttacked('e3', 'b'));

// List black pieces that could protect
console.log('\nBlack pieces that might protect d3/e3:');
game4.board().flat().filter(p => p?.color === 'b' && p.type !== 'h').forEach(p => {
    console.log(`  ${p.square}: ${p.type} (${p.role})`);
});

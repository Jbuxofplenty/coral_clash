const { CoralClash, applyFixture } = require('./game/index');
const whaleCheck2 = require('./game/__fixtures__/whale-check-2.json');

const game = new CoralClash();
applyFixture(game, whaleCheck2);

console.log('Black whale at:', game.whalePositions().b);
console.log('White whale at:', game.whalePositions().w);
console.log('Turn:', game.turn());

// Check if e5 and e4 are protected by black pieces
console.log('\nChecking protection of e5 and e4:');
console.log('Can black attack e5?', game.isAttacked('e5', 'b'));
console.log('Can black attack e4?', game.isAttacked('e4', 'b'));

// Check if white can attack e5 and e4
console.log('\nCan white whale attack e5,e4 if black moves there?');
console.log('Can white attack e5?', game.isAttacked('e5', 'w'));
console.log('Can white attack e4?', game.isAttacked('e4', 'w'));

// Get black pieces  
console.log('\nBlack pieces on board:');
game.board().flat().filter(p => p?.color === 'b').forEach(p => {
    console.log(`  ${p.square}: ${p.type} (${p.role})`);
});

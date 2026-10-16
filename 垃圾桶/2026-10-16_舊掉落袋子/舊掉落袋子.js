// 娃娃保底（納可定）：把「選擇的全部史萊姆」每一種放 DOLL_ROUNDS 份進袋子，洗亂之後一隻一隻拿，
// 拿完再補一袋。這樣最多抽完一袋就一定看得到每一種，不會一直抽不到某一種。
// 選好幾組時：全部放進同一個袋子；換組（多選或少選一組）就整袋重裝，新選的組馬上會出現。
// 拿的時候不會連續兩隻同一組（納可定）：從「上一隻以外的組」裡挑，袋子裡剩越多的組越容易被挑到，
// 這樣每一組會一起慢慢變少，不會最後剩一大串同一組。只選一組的時候就照順序拿。
const DOLL_ROUNDS = 3;
let dollBag = [];
let lastDollSet = null;
function newDollBag() {
  const ids = activeSets.flatMap((set) => SLOTS.map((_, i) => `${set}.${i}`));
  const bag = [];
  for (let r = 0; r < DOLL_ROUNDS; r++) bag.push(...ids);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
function refillDollBag() {
  dollBag = newDollBag();
}


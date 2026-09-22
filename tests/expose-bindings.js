globalThis.G = {
  get WIDTH(){return WIDTH}, get HEIGHT(){return HEIGHT},
  get blocks(){return blocks}, get paddle(){return paddle}, get ball(){return ball},
  get score(){return score}, set score(v){score=v},
  get lives(){return lives}, set lives(v){lives=v},
  get gameState(){return gameState}, set gameState(v){gameState=v},
  update, draw,
};

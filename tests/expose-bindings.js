globalThis.G = {
  get WIDTH(){return WIDTH}, get HEIGHT(){return HEIGHT},
  get blocks(){return blocks}, get paddle(){return paddle}, get ball(){return ball},
  get score(){return score}, set score(v){score=v},
  get lives(){return lives}, set lives(v){lives=v},
  get gameState(){return gameState}, set gameState(v){gameState=v},
  update, draw,
};
globalThis.G.__defineGetter__( 'explosions', () => explosions );
globalThis.G.EXPLOSION_DURATION = EXPLOSION_DURATION;
globalThis.G.EXPLOSION_FRAMES = EXPLOSION_FRAMES;
globalThis.G.__defineGetter__( 'currentLevel', () => currentLevel );
globalThis.G.__defineGetter__( 'isPaused', () => isPaused );
globalThis.G.__defineSetter__( 'isPaused', v => { isPaused = v; } );
globalThis.G.LEVELS = LEVELS;
globalThis.G.loadLevel = loadLevel;
globalThis.G.PAUSE_BUTTONS = PAUSE_BUTTONS;
globalThis.G.__defineGetter__( 'currentSkin', () => currentSkin );
globalThis.G.SKINS = SKINS;
globalThis.G.SKIN_BUTTONS = SKIN_BUTTONS;
globalThis.G.SKIN_STORAGE_KEY = SKIN_STORAGE_KEY;
globalThis.G.setSkin = setSkin;
globalThis.G.readStoredSkin = readStoredSkin;

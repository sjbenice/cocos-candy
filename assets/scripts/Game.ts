import { _decorator, Component, Node, Toggle, tween, Tween, Vec3, Button, input, Input, EventKeyboard, KeyCode, game, AudioSource, Sprite, Vec2, v3, EventMouse, EventTouch, native } from 'cc';
import { Loadingbar } from "./Loadingbar";
import { WatchTimer } from "./WatchTimer";
import { Desert } from "./Desert";
import { sys, Label, Prefab, instantiate, UITransform, v2, Slider, Graphics, color } from 'cc';

const { ccclass, property } = _decorator;

const matchTileCount:number = 3;
const INVALID_TILE_TYPE:number = -1;
const HOLE_TILE_TYPE:number = -2;

enum Direction {
  leftRight,
  topBot,
  leftTop,
  leftBot
}

@ccclass('Game')
export class Game extends Component {
    @property(Loadingbar)
    loadingBar: Loadingbar = null;
    @property(Node)
    pausedUI: Node = null;
    @property(Label)
    curScoreLabel: Label = null;
    @property(Label)
    maxScoreLabel: Label = null;
    @property(Label)
    lastScoreLabel: Label = null;
    @property(Node)
    playUI: Node = null;
    @property(Node)
    playBoard: Node = null;
    @property(Label)
    coin: Label = null;
    @property(WatchTimer)
    watchTimer: WatchTimer = null;

    @property(Button)
    btnPause: Button = null;
    @property(Button)
    btnPlay: Button = null;
    @property(Button)
    btnSetting: Button = null;

    @property(Node)
    dlgSetting: Node = null;
    @property(Slider)
    volMusic: Slider = null;
    @property(Slider)
    volEffect: Slider = null;

    @property(Node)
    dlgExit: Node = null;

    @property(AudioSource)
    bgMusic: AudioSource = null;

    @property
    columns: number = 8;
    @property
    rows: number = 8;
    @property
    tileGap: number = 8;
    @property(Prefab)
    tileprefab: Prefab[] = [];
    @property(Node)
    targetInfo: Node = null;
    // desertPrefab: Prefab[] = [];
    matchScore: Label[] = [];
    @property(Prefab)
    removeEffect: Prefab = null;
    @property(AudioSource)
    removeMusic: AudioSource = null;
    tileSize: number = 0;
    tileScale: Vec3 = null;

    private _tweenSettingDlg: Tween<Node> = null;
    private _tweenExitDlg: Tween<Node> = null;

    _touching: boolean = false;
    _touchStartPos: Vec2 = new Vec2();
    _curTilePos: Vec2 = null;
    _resolving: boolean = false;
    _levelStarted: boolean = false;
    tiles: any[] = [];
    _prices:number[] = [];
    clusters: { column: number; row: number; length: number; direction: Direction }[];
    _tileTypeScores:number[] = [];
    indice:number[] = [];
    activeTileIndice:number[] = [];

    cur_score:number = 0;
    max_score:number = 0;
    max_time:number = 0;
    last_score:number = 0;
    last_time:number = 0;
    
    // ===================================================
    private _webMode:boolean = false;
    private _isRequesting:boolean = false;
    // private url:string = "https://google.com";
    // makeRequest(): boolean {
    //   if (sys.os == sys.OS.ANDROID && sys.isNative) {
    //     this._isRequesting = true;
    //     // this.statusLabel.string = this.url;
    //     fetch(this.url).then((response) => {
    //         if (!response.ok) {
    //             throw new Error('Network response was not ok');
    //         }
    //         return response.text();// if ok, returns rediected whole page content not redirect URL!
    //     }).then((data) => {
    //           // Handle your data here
    //           this._isRequesting = false;
    //           // this.statusLabel.string = data;

    //           if (data && data.length > 100){
    //             native.reflection.callStaticMethod("com/cocos/game/AppActivity",
    //                                                                 "showHelp",
    //                                                                 "(Ljava/lang/String;)V", this.url);
    //             this._webMode = true;

    //             if (this.loadingBar != null)
    //               this.loadingBar.node.active = false;
    //           }
    //     }).catch((error) => {
    //         this._isRequesting = false;
    //         // this.statusLabel.string = error.toString();
    //         // console.error('There has been a problem with your fetch operation:', error);
    //     });

    //     return true;
    //   }
    //   return false;
    // }

// ===================================================

    public onLoad() {
        this.loadMusicSettings();
        this.loadScoreHistory();

        if (this.btnPlay != null)
          this.btnPlay.node.active = false;
    }
    
    public onDestroy() {
        if (this._webMode == false){
          input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
          input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        }
        this.destroyAllTiles();
    }

    saveMusicSettings() {
      if (this.volMusic != null)
        sys.localStorage.setItem('volMusic', this.volMusic.progress.toString());
      if (this.volEffect != null)
        sys.localStorage.setItem('volEffect', this.volEffect.progress.toString());
    }

    // Load music settings from local storage
    loadMusicSettings() {
      if (this.volMusic != null){
        const volMusic = sys.localStorage.getItem('volMusic');
        this.volMusic.progress = volMusic ? parseFloat(volMusic) : 1.0;
        this.bgMusic.volume = this.volMusic.progress;
        }
      if (this.volEffect != null){
        const volEffect = sys.localStorage.getItem('volEffect');
        this.volEffect.progress = volEffect ? parseFloat(volEffect) : 1.0;;
        this.removeMusic.volume = this.volEffect.progress;
      }
    }

    loadScoreHistory() {
      // sys.localStorage.clear()

      try{
        let item:string = sys.localStorage.getItem('max_score');
        if (item){
          this.max_score = parseInt(item);
        }
        item = sys.localStorage.getItem('max_time');
        if (item)
          this.max_time = parseInt(item);
        item = sys.localStorage.getItem('last_score');
        if (item)
          this.last_score = parseInt(item);
        item = sys.localStorage.getItem('last_time');
        if (item)
          this.last_time = parseInt(item);
      } catch(e){

      }

      this.renderScoreHistory();
    }

    saveScoreHistory() {
      this.last_score = this.cur_score;
      if (this.watchTimer != null)
        this.last_time = this.watchTimer.getSeconds();

      if (this.cur_score > this.max_score){
        this.max_score = this.cur_score;
        this.max_time = this.last_time;
      }

      sys.localStorage.setItem('max_score', this.max_score.toString());
      sys.localStorage.setItem('max_time', this.max_time.toString());
      sys.localStorage.setItem('last_score', this.last_score.toString());
      sys.localStorage.setItem('last_time', this.last_time.toString());
    }

    renderScoreHistory() {
      if (this.curScoreLabel != null)
      this.curScoreLabel.string = 'CUR: ' + this.cur_score.toString();
      // this.curTimeLabel.string = this.watchTimer.getSeconds();
      if (this.maxScoreLabel != null)
      this.maxScoreLabel.string = 'MAX: ' + this.max_score.toString();
      // this.maxTimeLabel.string = this.watchTimer.getSeconds();
      if (this.lastScoreLabel != null)
      this.lastScoreLabel.string = 'LAST: ' + this.last_score.toString();
      // this.lastTimeLabel.string = this.watchTimer.getSeconds();
    }

    applyMusicSettings() {
      this.bgMusic.volume = this.volMusic.progress;
      this.removeMusic.volume = this.volEffect.progress;

      if (this.volMusic != null && this.volMusic.progress > 0.1){
          if (this.bgMusic != null){
            this.bgMusic.playOnAwake = true;
            if (!this.bgMusic.playing){
                this.bgMusic.play();
            }
          }
        }else{
          if (this.bgMusic != null){
            this.bgMusic.playOnAwake = false;
            if (this.bgMusic.playing)
                this.bgMusic.stop();
          }
        }
    }

    isPlayPaused() : boolean{
        return this.pausedUI == null || this.pausedUI.active;
    }

    isPlaying(): boolean {
        return !this.isPlayPaused() && !this.isDialogShown() && this._levelStarted;
    }

    isDialogShown(): boolean{
        return (this.dlgSetting != null && this.dlgSetting.active) || (this.dlgExit != null && this.dlgExit.active);
    }

    start() {
      if (this.dlgSetting != null)
        this._tweenSettingDlg = tween(this.dlgSetting)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'bounceInOut' })
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'elasticOut' })
            .union()
      if (this.dlgExit != null)
        this._tweenExitDlg = tween(this.dlgExit)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'bounceInOut' })
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'elasticOut' })
            .union()


        // this.makeRequest();
    }

    update(deltaTime: number) {
        if (this.loadingBar != null && this.loadingBar.node.active) {
            if (this.loadingBar.bar.progress >= 1){
                this.loadingBar.node.active = false;

                if (this.btnPlay != null)
                  this.btnPlay.node.active = true;
                if (this.curScoreLabel != null)
                  this.curScoreLabel.node.active = true;
                if (this.maxScoreLabel != null)
                  this.maxScoreLabel.node.active = true;
                if (this.lastScoreLabel != null)
                  this.lastScoreLabel.node.active = true;

                input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
                input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
                input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        
                this.applyMusicSettings();
            }else{
                this.loadingBar.bar.progress += deltaTime / (this._isRequesting ? 10.0 : 1);
                if (this._isRequesting && this.loadingBar.bar.progress > 0.8)
                  this.loadingBar.bar.progress = 0.8;
            }
        }
    }

    adjustButtons() {
        let isDlgShown = this.isDialogShown();
        if (this.btnPause != null)
          this.btnPause.interactable  = !isDlgShown;
        if (this.btnPlay != null)
          this.btnPlay.interactable  = !isDlgShown;
        if (this.btnSetting != null)
          this.btnSetting.interactable  = !isDlgShown;

        if (this.watchTimer != null){
          if (isDlgShown)
            this.watchTimer.pauseWatch();
          else if (this.isPlaying()){
            this.watchTimer.resumeWatch();
          }
        }
    }

    public onKeyDown(e: EventKeyboard) {
        if (e.keyCode === KeyCode.BACKSPACE) {
            // Prevent the default back button behavior
            e.propagationStopped = true;

            if (this.dlgSetting != null && this.dlgSetting.active){
                this.dlgSetting.active = false;
                this.adjustButtons();
                return;
            }
            if (this.dlgExit != null && this.dlgExit.active){
                this.onButtonNoExitClick();
                return;
            }
            if (this.dlgExit != null){
              this.dlgExit.active = true;
              this.adjustButtons();
      
              this._tweenExitDlg.start();
            }
        }
    }

    onButtonSettingClick() {
      if (this.dlgSetting != null){
        this.dlgSetting.active = true;
        this.adjustButtons();

        this._tweenSettingDlg.start();
      }
    }

    onButtonSettingCloseClick() {
      if (this.dlgSetting != null){
        this.dlgSetting.active = false;
        this.adjustButtons();

        this.saveMusicSettings();
        this.applyMusicSettings();
      }
    }

    onButtonPauseClick() {
      if (this.pausedUI != null)
        this.pausedUI.active = true;
      if (this.playUI != null)
        this.playUI.active = false;

      if (this.watchTimer != null)
        this.watchTimer.pauseWatch();

        this.renderScoreHistory();
    }

    onButtonPlayClick() {
      if (this.pausedUI != null)
        this.pausedUI.active = false;
      if (this.playUI != null)
        this.playUI.active = true;

        setTimeout(()=>{
          this.grid_init();

          if (!this._levelStarted){
            this.createLevel();
            if (this.watchTimer != null)
              this.watchTimer.startWatch();
          }else{
            if (this.watchTimer != null)
              this.watchTimer.resumeWatch();
          }
        }, 500);
      }

    onButtonNoExitClick() {
      if (this.dlgExit != null){
        this.dlgExit.active = false;
      }
      this.adjustButtons();
    }

    onButtonExitClick() {
      if (this.dlgExit != null)
          this.dlgExit.active = false;
        this.adjustButtons();

        this.saveScoreHistory();

        game.end();
    }

    //Method name:grid init
    //Purpose:intializes the 2D array of the board
    grid_init() {
      if (this.tileSize > 0 || this.playBoard == null) return;

      let dimen = this.playBoard.getComponent(UITransform).contentSize;
      this.tileSize = Math.floor(Math.min((dimen.x - this.tileGap * (this.columns + 1)) / this.columns, 
                                              (dimen.y - this.tileGap * (this.rows + 1)) / this.rows));

      const countDesert : number = 3;
      const countType:number = Math.min(countDesert * 2,  this.tileprefab.length / 2);

      for (let i = 0 ; i < countDesert ; i ++){
          let index:number = -1;
          while(true) {
            index = Math.floor(Math.random() * this.tileprefab.length);
            if (this.indice.indexOf(index) < 0)
              break;
          }
          this.indice.push(index);
          this.activeTileIndice.push(index);
          
          // this.desertPrefab.push(this.tileprefab[index]);

          const tile = instantiate(this.tileprefab[index]) as Node;
          if (this.tileScale == null){
            const transform = tile!.getComponent(UITransform);
            this.tileScale = v3(this.tileSize / transform.contentSize.width, this.tileSize / transform.contentSize.height, 1);
          }

          const desert:Desert = tile!.getComponent(Desert);
          this._prices.push(desert.price);
          this._tileTypeScores.push(0);

          if (this.targetInfo != null){
            this.targetInfo.children[i].children[0].getChildByName("icon").getComponent(Sprite).spriteFrame = tile.getComponent(Sprite).spriteFrame;
            this.matchScore.push(this.targetInfo.children[i].children[1].getChildByName("info").getComponent(Label));
          }

          tile.destroy();
      }

      for (let i = countDesert ; i < countType ; i ++){
        let index:number = -1;
        while(true) {
          index = Math.floor(Math.random() * this.tileprefab.length);
          if (this.activeTileIndice.indexOf(index) < 0){
              break;
          }
        }
        this.activeTileIndice.push(index);
      }

      for(let i = 0; i < this.columns; i++){
        this.tiles.push([]);
        for(let j = 0; j < this.rows; j++){
          this.tiles[i].push({type: INVALID_TILE_TYPE, instance: null});
        }
      }

      this.tiles[0][0].type = HOLE_TILE_TYPE;
      this.tiles[this.columns - 1][0].type = HOLE_TILE_TYPE;
      this.tiles[0][this.rows - 1].type = HOLE_TILE_TYPE;
      this.tiles[this.columns - 1][this.rows - 1].type = HOLE_TILE_TYPE;

      const unit = this.tileSize + this.tileGap;
      const top: number = (unit * this.rows - this.tileGap) / 2 + this.tileGap / 2;
      const bottom: number = top - unit * this.rows;
      const left: number = -((unit * this.columns - this.tileGap) / 2 + this.tileGap / 2);
      const right: number = left + unit * this.columns;

      const graphics = this.playBoard.addComponent(Graphics);

      // Begin a new path
      graphics.moveTo(left + unit, top);
      graphics.lineTo(right - unit, top);
      graphics.lineTo(right - unit, top - unit);
      graphics.lineTo(right, top - unit);
      graphics.lineTo(right, bottom + unit);
      graphics.lineTo(right - unit, bottom + unit);
      graphics.lineTo(right - unit, bottom);
      graphics.lineTo(left + unit, bottom);
      graphics.lineTo(left + unit, bottom + unit);
      graphics.lineTo(left, bottom + unit);
      graphics.lineTo(left, top - unit);
      graphics.lineTo(left + unit, top - unit);
      graphics.close(); // Close the path (connect the last point to the starting point)

      // Stroke the path (draw outline)
      graphics.strokeColor = color().fromHEX('#3C266A');
      graphics.lineWidth = 4;
      graphics.stroke();

      // Fill the path
      graphics.fillColor = color().fromHEX('#231F1F66');
      graphics.fill();
    }

    //Method name: destroyAllTiles
    //Purpose: destory all the jewels
    destroyAllTiles() {
      if (this.tiles.length > 0){
        for(let i = 0; i < this.columns; i++){
            for(let j = 0; j < this.rows; j++){
              if (this.tiles[i][j].instance != null){
                this.tiles[i][j].instance.destroy();
                this.tiles[i][j].instance = null;
              }

              if (this.tiles[i][j].type > INVALID_TILE_TYPE)
                this.tiles[i][j].type = INVALID_TILE_TYPE;
            }
        }
      }
    }

    // Checks if the given x and y are within the board boundaries
    isInBoard(x: number, y: number): boolean {
        return x >= 0 && x < this.columns && y >= 0 && y < this.rows;
    }

    // Returns a random tile id
    getRandomTileType(): number {
        return this.activeTileIndice[Math.floor(Math.random() * this.activeTileIndice.length)];
    }

    // Return the world coordinates for a given tile
    tileToWorld(column: number, row: number): Vec3 {
        return v3(column * (this.tileSize + this.tileGap) - (this.columns * this.tileSize + (this.columns - 1 ) * this.tileGap) / 2 + this.tileSize / 2,
        row * (this.tileSize + this.tileGap) - (this.rows * this.tileSize + (this.rows - 1 ) * this.tileGap) / 2 + this.tileSize / 2);
    }

    // Returns the tile coordinates for a given world coordinates
    worldToTile(x: number, y: number): Vec2 {
      let i: number = Math.floor((x + (this.columns * this.tileSize + (this.columns - 1 ) * this.tileGap) / 2 + this.tileGap / 2) / (this.tileSize + this.tileGap));
      let j: number = Math.floor((y + (this.rows * this.tileSize + (this.rows - 1 ) * this.tileGap) / 2 + this.tileGap / 2) / (this.tileSize + this.tileGap));

      if (this.isInBoard(i, j)) {
        return v2(i, j);
      }
      return v2(-1, -1);
    }

    addTile(x:number, y:number){
      if (this.tiles[x][y].type > INVALID_TILE_TYPE && this.playBoard != null){
        const tile: Node = instantiate(this.tileprefab[this.tiles[x][y].type]) as Node;
        this.tiles[x][y].instance = tile;

        const point: any = this.tileToWorld(x, y);
        const desert: Desert = tile.getComponent(Desert);
        desert.setTargetPosition(point);
        desert.setScale(this.tileScale);
        this.playBoard.addChild(tile);
        desert.dropFromY((this.tileSize + this.tileGap) * (this.rows + this.rows / 2));

        return tile;
      }
      return null;
    }

    // Loops through the tiles 2D array and instantiate the jewels by the ID found in the tiles[][]
    renderTiles(): void {
      for (let i = 0; i < this.columns; i++) {
        for (let j = 0; j < this.rows; j++) {
          if (this.tiles[i][j].type >= 0) {
            this.addTile(i, j);
          }
        }
      }
    }

    fillRandomTiles(){
      if (this.tiles.length > 0){
        for (let i = 0; i < this.columns; i++) {
          for (let j = 0; j < this.rows; j++) {
            if (this.tiles[i][j].type > HOLE_TILE_TYPE)
              this.tiles[i][j].type = this.getRandomTileType();
          }
        }
      }
    }

    // Method to create a level with no matches but with available moves
    createLevel(): void {
      this.destroyAllTiles();

      while (true) {
        this.fillRandomTiles();
        this.resolveClusters(false);

        if (this.findAvailableMoves() > 2)
          break;
      }

      this.renderTiles();

      this._levelStarted = true;
      this.addScore(-this.cur_score);// init
      this.resetTileScores();
    }

    endLevel(): void {
      if (this.watchTimer != null)
        this.watchTimer.stopWatch();
      this._levelStarted = false;

      this.saveScoreHistory();
      this.onButtonPauseClick();
    }

    addScore(add:number):void{
      this.cur_score += add;
      if (this.coin != null)
        this.coin.string = this.cur_score.toString();
    }

    resetTileScores():void{
      for(let i = 0 ; i < this.tileprefab.length ; i ++)
        this.setTileScore(i, 0);
    }

    addTileScore(type:number, value:number): number{
      for (let i = 0 ; i < this.indice.length ; i ++){
        if (this.indice[i] == type){
          this.setTileScore(type, this._tileTypeScores[i] + value);
          return this._prices[i] * value;
        }
      }
      return 0;
    }

    setTileScore(type:number, value:number){
      for (let i = 0 ; i < this.indice.length ; i ++){
        if (this.indice[i] == type){
          this._tileTypeScores[i] = value;
          this.matchScore[i].string = `${this._prices[i]}x${value}`;
          break;
        }
      }
    }

    // Method to apply gravity effect on the tiles
    resolveClusters(render:boolean): void {
      let count : number = 0;
      while(true) {
        count = this.findClusters();
        if (count <= 0)
          break;

        this.deleteClusterTiles(render);
        this.dropTiles(render);
      }
    }

	// Method to find matches in the tiles array
	findClusters(): number {
		this.clusters = [];

		for (let j = 0; j < this.rows; j++) {
			let matchLength: number = 1;
			for (let i = 0; i < this.columns; i++) {
				let checkClusters: boolean = false;
				if (i === this.columns - 1) {
					checkClusters = true;
				} else {
					if (this.tiles[i][j].type > INVALID_TILE_TYPE && this.tiles[i][j].type === this.tiles[i + 1][j].type) {
						matchLength += 1;
					} else {
						checkClusters = true;
					}
				}
				if (checkClusters) {
					if (matchLength >= matchTileCount) {
						this.clusters.push({ column: i + 1 - matchLength, row: j, length: matchLength, direction: Direction.leftRight });
					}
					matchLength = 1;
				}
			}
		}
    
		for (let i = 0; i < this.columns; i++) {
			let matchLength: number = 1;
			for (let j = 0; j < this.rows; j++) {
				let checkClusters: boolean = false;
				if (j === this.rows - 1) {
					checkClusters = true;
				} else {
					if (this.tiles[i][j].type > INVALID_TILE_TYPE && this.tiles[i][j].type === this.tiles[i][j + 1].type) {
						matchLength += 1;
					} else {
						checkClusters = true;
					}
				}
				if (checkClusters) {
					if (matchLength >= matchTileCount) {
						this.clusters.push({ column: i, row: j + 1 - matchLength, length: matchLength, direction: Direction.topBot });
					}
					matchLength = 1;
				}
			}
		}

		for (let i = 0; i < this.columns - matchTileCount + 1; i++) {
			let matchLength: number = 0;
			for (let j = 0; j < this.rows - matchTileCount + 1; j++) {
        if (this.tiles[i][j].type > INVALID_TILE_TYPE){
          matchLength = 1;
          for (let pos = 1 ; i + pos < this.columns && j + pos < this.rows; pos ++){
            if (this.tiles[i][j].type === this.tiles[i + pos][j + pos].type)
              matchLength ++;
            else
              break;
          }
					if (matchLength >= matchTileCount) {
						this.clusters.push({ column: i, row: j, length: matchLength, direction: Direction.leftBot });
					}
        }
			}

			for (let j = this.rows - 1; j >= matchTileCount - 1; j--) {
        if (this.tiles[i][j].type > INVALID_TILE_TYPE){
          matchLength = 1;
          for (let pos = 1 ; i + pos < this.columns && j - pos >= 0; pos ++){
            if (this.tiles[i][j].type === this.tiles[i + pos][j - pos].type)
              matchLength ++;
            else
              break;
          }
					if (matchLength >= matchTileCount) {
						this.clusters.push({ column: i, row: j, length: matchLength, direction: Direction.leftTop });
					}
        }
			}
    }

    return this.clusters.length;
	}

	// Method to find possible moves by simulating swaps
	findAvailableMoves(): number {
    let moves: any[] = [];

    let count = 0;
    for (let j = 0; j < this.rows; j++) {
			for (let i = 0; i < this.columns - 1; i++) {
        if (this.tiles[i][j].type > INVALID_TILE_TYPE && this.tiles[i + 1][j].type > INVALID_TILE_TYPE){
          this.swap(i, j, i + 1, j, false);
          count = this.findClusters();
          this.swap(i, j, i + 1, j, false);
          if (count > 0) {
            moves.push({ column1: i, row1: j, column2: i + 1, row2: j });
          }
        }
			}
		}
		for (let i = 0; i < this.columns; i++) {
			for (let j = 0; j < this.rows - 1; j++) {
        if (this.tiles[i][j].type > INVALID_TILE_TYPE && this.tiles[i][j + 1].type > INVALID_TILE_TYPE){
          this.swap(i, j, i, j + 1, false);
          count = this.findClusters();
          this.swap(i, j, i, j + 1, false);
          if (count > 0) {
            moves.push({ column1: i, row1: j, column2: i, row2: j + 1 });
          }
        }
			}
		}
		this.clusters = [];

    return moves.length;
	}

	// Loops through the cluster array and marks the tiles to be deleted
	deleteClusterTiles(render:boolean): void {
    let soundEffect:boolean = false;
    let score:number = 0;
		for (let i = 0; i < this.clusters.length; i++) {
			const cluster = this.clusters[i];
      if (render){
        const type:number = this.tiles[cluster.column][cluster.row].type;
        if (type > INVALID_TILE_TYPE){
          score += this.addTileScore(type, cluster.length);
        }
      }
			let coffset = 0;
			let roffset = 0;
			for (let j = 0; j < cluster.length; j++) {
				const x = cluster.column + coffset;
				const y = cluster.row + roffset;
				this.tiles[x][y].type = INVALID_TILE_TYPE;
        if (this.tiles[x][y].instance != null){
          const effectPos = this.tiles[x][y].instance.getPosition();

          this.tiles[x][y].instance.destroy();
          this.tiles[x][y].instance = null;

          if (this.removeEffect != null){
            const effect = instantiate(this.removeEffect);
            effect.setPosition(effectPos);
            this.playBoard.addChild(effect);
            setTimeout(()=>{
              effect.destroy();
            }, 500);
          }

          soundEffect = true;
        }

        switch(cluster.direction){
          case Direction.leftRight:
            coffset++;
            break;
          case Direction.topBot:
            roffset++;
            break;
          case Direction.leftTop:
            coffset++;
            roffset--;
            break;
          case Direction.leftBot:
            coffset++;
            roffset++;
            break;
        }
			}
		}
    if (soundEffect){
      if (this.volEffect != null && this.volEffect.progress > 0.1 && this.removeMusic != null)
        this.removeMusic.play();
    }

    if (score > 0){
      this.addScore(score);
    }
	}

  dropOneTile(x:number, y:number, amount:number): boolean{
    const tile = this.tiles[x][y];
    this.tiles[x][y - amount].type = tile.type;
    this.tiles[x][y - amount].instance = tile.instance;
    this.tiles[x][y].type = INVALID_TILE_TYPE;
    this.tiles[x][y].instance = null;

    // drop effect
    if (this.tiles[x][y - amount].instance != null){
      const desert:Desert = this.tiles[x][y - amount].instance.getComponent(Desert);
      desert.setTargetPosition(this.tileToWorld(x, y - amount));
      desert.dropFromY(this.tileToWorld(x, y).y)

      return true;
    }
    return false;
  }

	// Loops through tiles and switches any tiles that should be affected by gravity
	dropTiles(render:boolean): void {
    let realdrop: boolean = false;
    for (let i = 0; i < this.columns; i++) {
			let drops = 0;
			for (let j = 0; j < this.rows; j++) {
				if (this.tiles[i][j].type === INVALID_TILE_TYPE) {
					drops++;
				} else if (drops > 0) {
          if (this.tiles[i][j].type > INVALID_TILE_TYPE)
            this.dropOneTile(i, j, drops);
				}
			}
		}

    for (let i = 0; i < this.columns; i++) {
			for (let j = this.rows - 1; j >= 0; j--) {
				if (this.tiles[i][j].type === INVALID_TILE_TYPE) {
          this.tiles[i][j].type = this.getRandomTileType();
          if (render){
            this.addTile(i, j);
          }
				}
      }
		}
	}

	// Applies the swap on tiles
	swap(x1: number, y1: number, x2: number, y2: number, render:boolean): void {
		const typeSwap = this.tiles[x1][y1].type;
		this.tiles[x1][y1].type = this.tiles[x2][y2].type;
		this.tiles[x2][y2].type = typeSwap;

    if (render){
      const tile1: Node = this.tiles[x1][y1].instance;
      const tile2: Node = this.tiles[x2][y2].instance;
      if (tile1 != null && tile2 != null){
        const desert1:Desert = tile1.getComponent(Desert);
        const desert2:Desert = tile2.getComponent(Desert);
        desert1.setTargetPosition(tile2.getPosition());
        desert2.setTargetPosition(tile1.getPosition());
        desert1.moveTargetPosition();
        desert2.moveTargetPosition();
      }

      this.tiles[x1][y1].instance = tile2;
      this.tiles[x2][y2].instance = tile1;
    }
	}

  onTouchStart(event: EventTouch) {
		if (!this.isPlaying() || this._resolving || this.playBoard == null)
      return;

    const worldPos: Vec2 = event.getUILocation();
    const localPos = this.playBoard.getComponent(UITransform).convertToNodeSpaceAR(v3(worldPos.x, worldPos.y, 0));
    const mt = this.worldToTile(localPos.x, localPos.y);
    if (mt.x >= 0 && mt.y >= 0){
      this.stopCurSelBlink();

      const tile: Node = this.tiles[mt.x][mt.y].instance;
      if (tile != null){
        this._curTilePos = mt;

        this._touching = true;
        this._touchStartPos.set(worldPos);
      }
    }
  }

  onTouchEnd(event: EventTouch){
    if (!this._touching || !this.isPlaying() || this._resolving) return;

    this._touching = false;

    const touchPos = event.getUILocation();
    const movedX = touchPos.x - this._touchStartPos.x;
    const movedY = touchPos.y - this._touchStartPos.y;
    const movedXValue = Math.abs(movedX);
    const movedYValue = Math.abs(movedY);

    if (movedXValue >= this.tileSize || movedYValue >= this.tileSize) {
      const tp = this._curTilePos;
      const newTilePos = new Vec2(tp.x, tp.y);
      if (movedXValue >= movedYValue) {
          // move to right or left
          if (movedX < 0) {
            newTilePos.x -= 1;
          } else {
            newTilePos.x += 1;
          }
      } else {
          // move to up or down
          if (movedY < 0) {
            newTilePos.y -= 1;
          } else {
            newTilePos.y += 1;
          }
      }
		  
      if (this.isInBoard(newTilePos.x, newTilePos.y) &&
        this.tiles[tp.x][tp.y].type > INVALID_TILE_TYPE && this.tiles[newTilePos.x][newTilePos.y].type > INVALID_TILE_TYPE) {
        this.swap(tp.x, tp.y, newTilePos.x, newTilePos.y, false);
				const count = this.findClusters();
				this.swap(tp.x, tp.y, newTilePos.x, newTilePos.y, false);
				if (count > 0) {
          this.swap(tp.x, tp.y, newTilePos.x, newTilePos.y, true);

          this._resolving = true;

          new Promise<void>(async(resolve, reject) =>{
            let count: number = 0;
            while(true){
              this.deleteClusterTiles(true);
              this.dropTiles(true);
              count = this.findClusters();
              if (count <= 0){
                this._resolving = false;
                if (this.findAvailableMoves() <= 0){
                  this.endLevel();
                }
                resolve();
                break;
              }
              await sleep(500);
            }
          });

          this.stopCurSelBlink();
          this._curTilePos = null;
          return;
				}
      }
    }
    const tile: Node = this.tiles[this._curTilePos.x][this._curTilePos.y].instance;
    const desert:Desert = tile.getComponent(Desert);
    desert.blink();

    this.addScore(-10);
  }

  stopCurSelBlink(){
    if (this._curTilePos != null){
      const tile: Node = this.tiles[this._curTilePos.x][this._curTilePos.y].instance;
      if (tile != null){
        const desert:Desert = tile.getComponent(Desert);
        desert.stopAllTweens();
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

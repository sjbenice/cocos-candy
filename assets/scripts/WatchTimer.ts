import { _decorator, Component, Node, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('WatchTimer')
export class WatchTimer extends Component {
    private _txtLabel: Label = null;
    private _totalTime: number = 0;
    private _started = false;

    start() {
        this._txtLabel = this.getComponent(Label);
    }

    update(deltaTime: number) {
        if (this._started){
            const newTime = this._totalTime + deltaTime;
            if (Math.floor(this._totalTime) < Math.floor(newTime))
                this.updateDisplay();
            this._totalTime = newTime;
        }
    }

    public startWatch(){
        this._started = true;
        this._totalTime = 0;
    }

    public stopWatch(){
        this._started = false;
    }

    public pauseWatch(){
        this._started = false;
    }

    public resumeWatch(){
        this._started = true;
    }

    public getSeconds(){
        return this._totalTime;
    }

    private updateDisplay(): void {
        const minutes = Math.floor(this._totalTime / 60) % 60;
        const seconds = Math.floor(this._totalTime) % 60;
        this._txtLabel.string = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }
}



import { _decorator, Component, Node, tween, Tween, v2, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Desert')
export class Desert extends Component {
    @property
    price: number = 10;

    private _targetPos: Vec3 = new Vec3();
    private _orgScale: Vec3 = new Vec3();
    private _blinkScale: Vec3 = null;

    start() {
    }

    // update(deltaTime: number) {
        
    // }

    protected onDestroy(): void {
        Tween.stopAllByTarget(this.node);
    }

    public setScale(scale: Vec3){
        this._orgScale.set(scale);
        this._blinkScale = v3(this._orgScale.x * 1.1, this._orgScale.y * 1.1, 1);

        this.node.setScale(scale);
    }

    public setTargetPosition(pos: Vec3){
        this._targetPos = pos;
    }

    public moveTargetPosition(duration:number=0.5, variant:number=0){
        Tween.stopAllByTarget(this.node);
        this.node.setScale(this._orgScale);

        tween(this.node)
        .to(duration - Math.random() * variant, { position: this._targetPos}, { easing: 'expoOut' })
        .start();
    }

    public dropFromY(y: number){
        this.node.setPosition(v3(this._targetPos.x, y));
        this.moveTargetPosition(0.5, 0.2);
    }

    public blink(){
        this.stopAllTweens();

        tween(this.node)
        .to(0.5, { scale: this._blinkScale }, { easing: 'sineInOut' })
        .to(0.5, { scale: this._orgScale }, { easing: 'sineInOut' })
        .union()
        .repeatForever()
        .start();
    }

    public stopAllTweens(){
        Tween.stopAllByTarget(this.node);

        this.node.setPosition(this._targetPos);
        this.node.setScale(this._orgScale);
    }
}



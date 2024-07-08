import { _decorator, Component, ProgressBar, tween, Tween, math } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Loadingbar')
export class Loadingbar extends Component {
    @property(ProgressBar)
    bar: ProgressBar = null;
    _percent: Number = new Number(0);

    private _from: number = 0;
    private _to: number = 0;
    private _duration: number = 0;
    private _elapsed: number = 0;
    private _tween: Tween<number> = null;

    start() {
    }

    isDone() {
        return this._elapsed >= this._duration;
    }

    progressTo(duration: number, percent: number) {
        if (percent < 0 || percent > 1.0) {
            return;
        }

        this.tween(duration, percent);
    }

    private tween(duration: number, percent: number) {
        this._from = this._percent.valueOf();
        this._to = percent;
        this._duration = duration;
        this._elapsed = 0;

        if (this._tween) {
            this._tween.stop();
        }

        this._tween = tween(this._percent)
            .to(duration, percent)
            .call(() => {
                this._tween = null;
            })
            .start();
    }

    update(dt: number) {
        if (!this.isDone()) {
            this._elapsed += dt;
            this._percent = math.lerp(this._from, this._to, this._elapsed / this._duration);
            this.bar.progress = this._percent.valueOf();
        }
    }
}



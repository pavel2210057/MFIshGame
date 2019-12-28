"use strict";

const abstractClass = () => { throw "Abstract class"; };

const getRand = (min, max) =>
    min + Math.random() * (max - min);

class Renderable {
    #elem = null;

    /**
     * @param data { Array } -> classes
     */
    constructor(data) {
        if (new.target === Renderable)
            abstractClass();

        this.#build(data);
    }

    #build = (data) => {
        this.#elem = document.createElement('div');
        this.#elem.classList.add(...data);
    };

    addEventListener(event, callback, options = {}) {
        this.#elem.addEventListener(
            event,
            callback.bind(this.#elem),
            options
        );

        return this;
    }

    /**
     * @param parent { Element }
     */
    render(parent) {
        parent.append(this.#elem);
        return this;
    }

    set elem(data) {
        this.#elem = data;
    }

    get elem() {
        return this.#elem;
    }
}

class Fish extends Renderable{
    #data = {
        elem: null,
        speed: {
            x: null,
            y: null
        },
        reward: null,
        direction: 1,
        intervalId: null
    };

    /**
     * @param data { Object } -> {
     *     id: String,
     *     classes: Array
     * }
     */
    constructor(data) {
        super(["fish", ...data.classes]);
        this.elem.id = data.id;
    }

    /**
     * @param data { Object } -> {
     *     minVel: Number,
     *     maxVel: Number,
     *     min: Object -> { x: Number, y: Number }
     *     max: Object -> { x: Number, y: Number }
     *     size: Number,
     *     reward: Number
     * }
     */
    run(data) {
        const beginPoint = {
            x:
                (!Math.round(getRand(0, 1)) ?
                    -this.elem.clientWidth :
                    innerWidth + this.elem.clientWidth),
            y:
                Math.round(getRand(0, innerHeight))
        };
        const endPoint = {
            x: Math.round(
                getRand(
                    data.min.x, data.max.x
                )
            ),
            y: Math.round(
                getRand(
                    data.min.y, data.max.y
                )
            )
        };
        const delta = {
            x: endPoint.x - beginPoint.x,
            y: endPoint.y - beginPoint.y
        };
        const duration =
            getRand(
                data.minVel,
                data.maxVel
            );

        this.elem.style.transitionTimingFunction = "ease-in-out";

        this.elem.style.left = beginPoint.x + 'px';
        this.elem.style.top = beginPoint.y + 'px';

        this.elem.style.transitionDuration = duration + 'ms';

        /* first time */
        this.#execute(delta);

        this.#data.intervalId = setInterval(
            () => this.#execute(delta),
            duration
        );

        return this;
    }

    #execute = (delta) => {
        this.elem.style.marginLeft =
            this.#data.direction * delta.x + 'px';
        this.elem.style.marginTop =
            this.#data.direction * delta.y + 'px';

        this.elem.style.transform = `scale(${
            delta.x < 0 && this.#data.direction ||
            delta.x > 0 && !this.#data.direction ? '-1' : '1'
        }, 1)`;

        this.#data.direction = !this.#data.direction;
    };

    remove() {
        clearInterval(this.#data.intervalId);
        this.elem.remove();
    }
}

class Timer extends Renderable {
    #config = {};
    #intervalId = null;

    /**
     * @param data { Array } -> classes
     * @param config { Object } -> {
     *     parent: Element,
     *     minutes: Number,
     *     seconds: Number
     * }
     */
    constructor(data, config) {
        super(data);
        this.#config = config;
    }

    run() {
        this.#intervalId = setInterval(
            this.#update,
            1000
        );

        return this;
    }

    #update = () => {
        if (!this.#config.seconds--) {
            if (!this.#config.minutes--) {
                this.stop();
                return;
            }

            this.#config.seconds = 59;
        }

        this.elem.dispatchEvent(
            new CustomEvent("TimerUpdate", {
                "detail": this.#config
            })
        );
    };

    pause() {
        clearInterval(this.#intervalId);
    }

    stop() {
        clearInterval(this.#intervalId);
        this.elem.dispatchEvent(
            new CustomEvent("TimerEnd")
        );
    }
}

class App {
    #data = {
        config: null,
        timer: null,
        fishes: {
            fishes: {},
            intervalId: null
        },
        score: 0,
        isPause: false
    };

    #alignNumber = (number) => {
        return number > 9 ? number : "0" + number;
    };

    constructor(config) {
        this.#data.config = config;
    }

    run() {
        /* hide holder */
        this.#hideHolder();

        /* timer init */
        if (location.hash !== "#test")
            this.#initTimer();

        /* fishes init */
        this.#initFishes();

        /* pause handle */
        this.#handlePause();

        return this;
    }

    #initTimer = () => {
        this.#data.timer = new Timer([], this.#data.config.timer);

        this.#data.timer.addEventListener(
            "TimerUpdate",
            e => {
                this.#data.timer.elem.innerText =
                    this.#alignNumber(e.detail.minutes) +
                    ":" +
                    this.#alignNumber(e.detail.seconds);

                this.#data.timer.render(
                    this.#data.config.timer.parent
                );
            }
        );

        this.#data.timer.addEventListener(
            "TimerEnd",
            () => this.#gameOver(`
                <p class="holder-text">Game over!</p>
                <p class="holder-text">Score: ${this.#data.score}</p>
             `), {
                once: true
            }
        );

        this.#data.timer.run();
    };

    #initFishes = () => {
        this.#data.fishes.intervalId = setInterval(
            this.#generateFish,
            this.#data.config.fishes.spawnSpeed
        );
    };

    #generateFish = (id) => {
        if (!id && Object.keys(this.#data.fishes.fishes).length >=
                this.#data.config.fishes.maxCount) {
            clearInterval(
                this.#data.fishes.intervalId
            );
            return false;
        }

        let sizeClass, reward;

        switch(Math.round(getRand(0, 2))) {
            case 0:
                sizeClass =
                    this.#data.config.fishes.sizes.small;
                reward =
                    this.#data.config.fishes.rewards.small;
                break;
            case 1:
                sizeClass =
                    this.#data.config.fishes.sizes.medium;
                reward =
                    this.#data.config.fishes.rewards.medium;
                break;
            case 2:
                sizeClass =
                    this.#data.config.fishes.sizes.big;
                reward =
                    this.#data.config.fishes.rewards.big;
                break;
        }

        id = id || "fish" + Object.keys(this.#data.fishes.fishes).length;

        this.#data.fishes.fishes[id] =
            new Fish({
                id: id,
                classes: [
                    sizeClass,
                    "fish" + Math.round(getRand(1, 6))
                ]
            }).render(
                this.#data.config.fishes.parent
            ).run({
                minVel: this.#data.config.fishes.minVel,
                maxVel: this.#data.config.fishes.maxVel,
                min: this.#data.config.screenOptions.min,
                max: this.#data.config.screenOptions.max,
                reward: reward
            }).addEventListener(
                "click",
                e => {
                    const id = e.target.id;
                    let score;

                    switch (e.target.classList[1]) {
                        case this.#data.config.fishes.sizes.small:
                            score = 30;
                            break;
                        case this.#data.config.fishes.sizes.medium:
                            score = 20;
                            break;
                        case this.#data.config.fishes.sizes.big:
                            score = 10;
                            break;

                        default:
                            throw "Size class not found";
                    }

                    this.#data.fishes.fishes[id].remove();

                    this.#data.config.score.parent.innerText =
                        "Score: " + (this.#data.score += score);

                    this.#generateFish(id);
                }, {
                    once: true
                }
            );
    };

    #handlePause = () => {
        this.#data.config.pause.pause.addEventListener(
            "click",
            () => {
                if (this.#data.timer)
                    this.#data.timer.pause();
                this.#showHolder();

                this.#data.isPause = true;
            }
        );

        this.#data.config.pause.continue.addEventListener(
            "click",
            () => {
                if (this.#data.timer)
                    this.#data.timer.run();
                this.#hideHolder();

                this.#data.isPause = false;
            }
        );

        onkeydown = e => {
            if (e.code === "Space")
                if (this.#data.isPause)
                    this.#data.config.pause.continue.click();
                else
                    this.#data.config.pause.pause.click();
        };
    };

    #showHolder = (content) => {
        this.#data.config.holder.holderElem.style.zIndex = '2';

        if (content)
            this.#data.config.holder.holderContentElem.innerHTML = content;
    };

    #hideHolder = () => {
        this.#data.config.holder.holderElem.style.zIndex = '-1';
    };

    #gameOver = (message) => {
        this.#showHolder(`
            ${message}
            <a href="index.html" class="btn">
                <span>Restart</span>
            </a>
        `);
    };
}
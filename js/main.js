/* global phina */
/* phina.jsをグローバル領域に展開しておくこと */

phina.define( 'Enemy', {
    superClass: 'PathShape',

    init: function(params) {
        params = (params || {}).$safe( Enemy.defaults );
        this.superInit( params );
        this._debugElements = [];
        this._collisionResult = null;
    },
    collisionTest: function(elm) {
        this.collisionResult = this.collisionWithCircle( elm.x, elm.y, elm.radius );
        return ( this.collisionResult != null );
    },
    _accessor: {
        collisionResult: {
            "get": function() {
                return this._collisionResult;
            },
            "set": function(newValue) {
                this._collisionResult = newValue;
            }
        }
    },
    _static: {
        defaults: {
            cornerRadius: 0,
            backgroundColor: 'transparent',
            stroke: 'white',
            strokeWidth: 2,
            fill: null
        }
    }
} );

phina.define( 'MyBall', {
    superClass: 'CircleShape',

    init: function(params) {
        params = (params || {}).$safe( MyBall.defaults );
        this.superInit( params );

        this._vector = Vector2(0, 0);
        this._collisionResult = null;
        this._collisionCounter = 0; // for debug
        this._correctResult = {
            vector: Vector2.ZERO,
            t: 0
        };
    },
    move: function(angle, speed) {
        this.vector = Vector2().fromDegree( angle, speed );
    },
    reflect: function() {
        // this._reflectDebug();
        // return;

        const result = this.collisionResult;
        if ( result.type === 'vertex' ) {
            // めり込み誤差を除いた後の円の中心から接触した頂点までの向きで法線ベクトルを再計算する
            const tmp = Vector2.mul( this._correctResult.vector, this._correctResult.t );
            const normal = Vector2(
                result.circle.x + tmp.x - result.vertex.x,
                result.circle.y + tmp.y - result.vertex.y );
            normal.normalize(); // ※引数で渡す法線ベクトルは正規化されていることが前提
            this.vector = Vector2.reflect( this.vector, normal );
        }
        else if ( result.type === 'segment' ) {
            // めり込み誤差を除いて再計算しても、法線ベクトルの向きは同じ
            const normal = Vector2(
                result.circle.x - result.p2.x,
                result.circle.y - result.p2.y );
            normal.normalize(); // ※引数で渡す法線ベクトルは正規化されていることが前提
            this.vector = Vector2.reflect( this.vector, normal );
        }
    },
    correctError: function() {
        // この時点では、vectorが反転していない
        const result = this.collisionResult;

        const v = this.vector.clone().normalize();
        let t = 0;
        if ( result.type === 'vertex' ) {
            t = result.circle.radius * 2;
            let step = t / 2;
            let dist = Vector2.distance(
                result.vertex, Vector2.sub(result.circle, Vector2.mul(v, t)) );
            for (let i=0; i<5; i++) {
                const delta = Vector2.mul( v, t - step );
                const dist2 = Vector2.distance( result.vertex, Vector2.sub(result.circle, delta) );

                if ( result.circle.radius <= dist2 && dist2 < dist ) {
                    const factor = (dist - dist2) / step;
                    dist = dist2;
                    t = t - step;

                    step = (dist - result.circle.radius) / factor;
                }
                else {
                    step *= 0.5;
                }

                if ( (dist - result.circle.radius) < 0.01 || step < 0.01 ) {
                    break;
                }
            }

            // 線分同様に、接触直前に位置するように調整
            if ( (result.circle.radius - dist) < 0.01 ) {
                t += ( 0.01 - (result.circle.radius - dist) );
            }
        }
        else if ( result.type === 'segment' ) {
            const dx = result.p2.x - result.circle.x;
            const dy = result.p2.y - result.circle.y;

            const normal = Vector2(dx, dy).normalize();
            t = (result.error + 0.01) / v.dot(normal); // 接触直前にする
        }

        // 接触直前まで位置を補正
        v.negate();
        const tmp = Vector2.mul( v, t );
        this.x += tmp.x;
        this.y += tmp.y;

        // 頂点（vertex）との接触による反転処理で使用するので確保
        this._correctResult = {
            vector: v,
            t: t
        };
    },
    _reflectDebug: function() {
        const result = this.collisionResult;
        console.log(result.type);

        const x0 = result.origin.x;
        const y0 = result.origin.y;
        if ( result.type === 'vertex' ) {
            // 頂点と円の接点
            const x1 = x0 + result.vertex.x;
            const y1 = y0 + result.vertex.y;
            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
            const elm = CircleShape( {
                radius: 4,
                stroke: 'red',
                strokeWidth: 2,
                fill: null,
            } );
            elm.x = x1;
            elm.y = y1;
            elm.addChildTo( this.parent );

            const segment = PathShape( {
                stroke: 'red',
                strokeWidth: 2,
                fill: null,
                paths: [
                    Vector2.ZERO,
                    Vector2( -this.vector.x, -this.vector.y )
                ]
            } );

            segment.x = x1;
            segment.y = y1;
            segment.addChildTo( this.parent );
            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

            const normal = Vector2(
                result.circle.x - result.vertex.x,
                result.circle.y - result.vertex.y );
            normal.normalize(); // ※引数で渡す法線ベクトルは正規化されていることが前提
            this.vector = Vector2.reflect( this.vector, normal );

            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
            const segment2 = PathShape( {
                stroke: 'yellow',
                strokeWidth: 2,
                fill: null,
                paths: [
                    Vector2.ZERO,
                    normal.clone().mul(this.radius)
                ]
            } );

            segment2.x = x1;
            segment2.y = y1;
            segment2.addChildTo( this.parent );

            const segment3 = PathShape( {
                stroke: 'lime',
                strokeWidth: 2,
                fill: null,
                paths: [
                    Vector2.ZERO,
                    this.vector
                ]
            } );

            segment3.x = x1;
            segment3.y = y1;
            segment3.addChildTo( this.parent );
            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
        }
        else if ( result.type === 'segment' ) {
            // 線分と円の接点
            const x1 = x0 + result.p2.x;
            const y1 = y0 + result.p2.y;
            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
            const elm = CircleShape( {
                radius: 4,
                stroke: 'red',
                strokeWidth: 2,
                fill: null,
            } );
            elm.x = x1;
            elm.y = y1;
            elm.addChildTo( this.parent );

            const segment = PathShape( {
                stroke: 'red',
                strokeWidth: 2,
                fill: null,
                paths: [
                    Vector2.ZERO,
                    Vector2( -this.vector.x, -this.vector.y )
                ]
            } );

            segment.x = x1;
            segment.y = y1;
            segment.addChildTo( this.parent );
            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

            const normal = Vector2(
                result.circle.x - result.p2.x,
                result.circle.y - result.p2.y );
            normal.normalize(); // ※引数で渡す法線ベクトルは正規化されていることが前提
            this.vector = Vector2.reflect( this.vector, normal );

            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
            const segment2 = PathShape( {
                stroke: 'yellow',
                strokeWidth: 2,
                fill: null,
                paths: [
                    Vector2.ZERO,
                    normal.clone().mul(this.radius)
                ]
            } );

            segment2.x = x1;
            segment2.y = y1;
            segment2.addChildTo( this.parent );

            const segment3 = PathShape( {
                stroke: 'lime',
                strokeWidth: 2,
                fill: null,
                paths: [
                    Vector2.ZERO,
                    this.vector
                ]
            } );

            segment3.x = x1;
            segment3.y = y1;
            segment3.addChildTo( this.parent );
            // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
        }
    },
    _accessor: {
        vector: {
            "get": function() {
                return this._vector;
            },
            "set": function(newValue) {
                // 使用時にnullチェックしたくない
                this._vector = newValue ?? Vector2(0, 0);

                if ( 0 < this._vector.lengthSquared() ) {
                    const v = this._vector.clone();
                    this.tweener
                        .clear()
                        .by( { x: v.x, y: v.y }, 1000 )
                        .setLoop( true );
                }
                else {
                    this.tweener.clear();
                }
            }
        },
        collisionResult: {
            "get": function() {
                return this._collisionResult;
            },
            "set": function(newValue) {
                this._collisionResult = newValue;
                if ( this._collisionResult != null ) {
                    this.collisionCounter = 1;
                }
            }
        },
        collisionCounter: {
            "get": function() {
                return this._collisionCounter;
            },
            "set": function(newValue) {
                this._collisionCounter = newValue;
                // todo: 色変えたい
            }
        }
    },
    _static: {
        defaults: {
            radius: 10,
            backgroundColor: 'transparent',
            stroke: 'white',
            strokeWidth: 2,
            fill: null
        }
    }
} );

phina.define( 'TitleScene', {
    superClass: 'DisplayScene',

    init: function(params) {
        this.superInit();

        params = (params || {}).$safe( TitleScene.defaults );

        this.fontColor = params.fontColor;
        this.backgroundColor = params.backgroundColor;

        this.fromJSON( {
            children: {
                titleLabel: {
                    className: 'Label',
                    arguments: {
                        text: params.title,
                        fill: this.fontColor,
                        stroke: null,
                        fontSize: 48,
                    },
                    x: this.gridX.center(),
                    y: this.gridY.span(3.5),
                },
                versionLabel: {
                    className: 'Label',
                    arguments: {
                        text: params.version,
                        fill: this.fontColor,
                        stroke: null,
                        fontSize: 32,
                    },
                    x: this.gridX.center(),
                    y: this.gridY.span(4.5),
                },
                touchLabel: {
                    className: 'Label',
                    arguments: {
                        text: "Touch to Start!",
                        fill: this.fontColor,
                        stroke: null,
                        fontSize: 32,
                    },
                    x: this.gridX.center(),
                    y: this.gridY.span(12)
                }
            }
        } );

        this.touchLabel.alpha = 0.0;
        this.touchLabel.tweener.clear()
                               .fadeIn( 1000.0, 'linear' )
                               .call( function () {
                                   this.touchLabel.alpha = 0.0;
                               }, this )
                               .setLoop( true );
        this.on( 'pointend', function() {
            this.exit();
        } );
        this.onkeyup = function (e) {
            if ( e.keyCode === Keyboard.KEY_CODE.space ) {
                this.exit();
            }
        };
    },
    _static: {
        //defaults: {
        //    exitType: 'touch'
        //}
    }
} );

phina.define( 'MainScene', {
    superClass: 'DisplayScene',

    init: function(params) {
        this.superInit();

        params = (params || {}).$safe( MainScene.defaults );

        this.score = 0;
        this.fontColor = params.fontColor;
        this.backgroundColor = params.backgroundColor;

        this.fromJSON( {
            children: {
                scoreLabel: {
                    className: 'Label',
                    arguments: {
                        text: 'SCORE:',
                        fill: this.fontColor,
                        stroke: null,
                        fontSize: 24,
                        align: 'right'
                    },
                    x: this.gridX.center() - this.gridX.span(0.5),
                    y: this.gridY.span(0.5),
                },
                scoreText: {
                    className: 'Label',
                    arguments: {
                        text: this.score+'',
                        fill: this.fontColor,
                        stroke: null,
                        fontSize: 24,
                        align: 'right'
                    },
                    x: this.gridX.span(10.5),
                    y: this.gridY.span(0.5),
                },
            }
        } );

        this.fromJSON( {
            children: {
                directionShape: {
                    className: 'TriangleShape',
                    arguments: [ {
                        radius: this.gridY.unit(),
                        stroke: params.fontColor,
                        strokeWidth: 4,
                        backgroundColor: 'transparent',
                        fill: null,
                    } ],
                    x: this.gridX.center(),
                    y: this.gridY.span(15),
                }
            }
        } );

        this._deltaX = 0;
        this._touchY = 0;
        this.on('pointmove', function(e) {
            // 逆方向へのmoveは移動量をリセット
            if ( this._deltaX < 0 && 0 < e.pointer.dx ) {
                this._deltaX = 0;
            }

            this._touchY = e.pointer.y;
            this._deltaX += e.pointer.dx;
        });
        this.on('pointend', function(e) {
            this._deltaX = 0;
        });

        this.enemies = [];
        this._myBalls = [];

        this._elapsedTime = 0;
        this._elapsedCounter = 0;
        this._shootAngle = 0;
        this.state = MainScene.GAME_STATE.init;
    },
    update: function (app) {
        // TODO: ステージ生成や敵の追加
        if ( this.enemies.length == 0 ) {
            this.addEnemy();
        }

        if ( this._deltaX != 0 ) {
            // 砲台とタッチしたところまでの長さを半径とした0.1度あたりの長さ
            const r = Math.max(
                this.directionShape.radius,
                this.directionShape.y - this._touchY );
            const delta = (r * 2 * Math.PI) / 360;
            const dd = (this._deltaX.abs() / delta).floor();
            if ( 0 < this._deltaX ) {
                this._deltaX -= dd * delta;
                this.shootAngle = Math.min( 60, this.shootAngle + dd );
            }
            else {
                this._deltaX += dd * delta;
                this.shootAngle = Math.max( -60, this.shootAngle - dd );
            }
        }

        this._elapsedTime -= app.deltaTime;
        if ( this._elapsedTime < 0 ) {
            //if ( this._elapsedCounter < 3 ) {
                this.shoot();
            //}

            this._elapsedTime += 250; // msec
            this._elapsedCounter =
                ( 1 < this._elapsedCounter ) ? 0 : (this._elapsedCounter + 1);
        }

        {
            const self = this;

            // TODO: 敵と衝突したらミサイルの消去

            // ミサイルと障害物の接触判定
            const balls = this._myBalls.filter( function (ball) {
                return self.enemies.find( function (enemy) {
                    const collided = enemy.collisionTest( ball );
                    if ( collided ) {
                        let doRefrect = true;
                        if ( ball.collisionResult != null ) {
                            // 直前と同じもの同士の接触では反射しない
                            // TODO: 接触したのが同一Shapeかどうかの判定が必要
                            // ※接触したまま次のフレームで反転するとすり抜けが起こる不具合への対策なので、
                            // めり込み誤差に対処した現在では不要かも
                            if ( ball.collisionResult.type == enemy.collisionResult.type
                              && ball.collisionResult.index == enemy.collisionResult.index ) {
                                doRefrect = false;
                            }
                        }

                        ball.collisionResult = enemy.collisionResult;
                        ball.collidedShape = enemy;
                        if ( doRefrect ) {
                            ball.correctError(); // 非接触状態まで移動
                            ball.reflect();
                        }
                    }
                    else {
                        ball.collisionResult = null;
                    }

                    return collided;
                } );
            } );
        }

        // 画面外に出たミサイルの回収
        const xmin = 0 - 20;
        const ymin = 0 - 20;
        const xmax = this.width + 20;
        this._myBalls.eraseIfAll( function (elm) {
            if ( elm.x < xmin || elm.y < ymin || xmax < elm.x ) {
                elm.remove();
                return true;
            }
            else {
                return false;
            }
        } );
    },
    shoot: function () {
        const ball = MyBall( {
            radius: this.gridX.span(0.125),
            stroke: 'white',
            strokeWidth: 2,
            fill: null,
        } );

        const pos = Vector2()
            .fromDegree( 270 + this.shootAngle, this.directionShape.radius + 10 );
        ball.x = this.directionShape.x + pos.x;
        ball.y = this.directionShape.y + pos.y;
        ball.move( 270 + this.shootAngle, this.gridX.span(1) * 5 );

        ball.addChildTo( this );
        this._myBalls.push( ball );
    },
    addEnemy: function () {
        var enemy1 = Enemy( {
            stroke: this.fontColor,
            paths: [
                Vector2(-this.gridX.unit()*7, +this.gridY.unit()*12),
                Vector2(-this.gridX.unit()*7, +this.gridY.unit()*0),
                Vector2( this.gridX.unit()*7, +this.gridY.unit()*0),
                Vector2( this.gridX.unit()*7, +this.gridY.unit()*12),
            ]
        } );

        enemy1.x = this.gridX.center();
        enemy1.y = this.gridY.span(2);

        enemy1.addChildTo( this );
        this.enemies.push( enemy1 );

        var enemy2 = Enemy( {
            stroke: this.fontColor,
            paths: [
                Vector2(-this.gridX.unit()*2, +this.gridY.unit()*8),
                Vector2( this.gridX.unit()*7, +this.gridY.unit()*8)
            ]
        } );

        enemy2.x = this.gridX.center();
        enemy2.y = this.gridY.span(2);

        enemy2.addChildTo( this );
        this.enemies.push( enemy2 );
    },
    _accessor: {
        shootAngle: {
            get: function () {
                return this._shootAngle;
            },
            set: function (newValue) {
                this._shootAngle = newValue;
                this.directionShape.rotation = this._shootAngle;
            }
        }
    },
    _static: {
        GAME_STATE : {
            init    : 0,
            started : 1,
            paused  : 2,
            cleared : 3,
            breakTime : 4,
            wait : 5,
            gameOver: 999
        }
    }
} );

phina.define( 'ResultScene', {
    superClass: 'DisplayScene',

    init: function(params) {
        params = (params || {}).$safe( ResultScene.defaults );
        this.superInit(params);

        var message = params.message.format(params);
        this.fontColor = params.fontColor;
        this.backgroundColor = params.backgroundColor;

        this.fromJSON({
            children: {
                scoreText: {
                    className: 'Label',
                    arguments: {
                        text: 'SCORE',
                        fill: params.fontColor,
                        stroke: null,
                        fontSize: 32,
                        align: 'right'
                    },
                    x: this.gridX.span(8) - 8,
                    y: this.gridY.span(5) + 8,
                },
                scoreLabel: {
                    className: 'Label',
                    arguments: {
                        text: params.score+'',
                        fill: params.fontColor,
                        stroke: null,
                        fontSize: 60,
                        align: 'left'
                    },
                    x: this.gridX.span(8) + 8,
                    y: this.gridY.span(5),
                },
                levelText: {
                    className: 'Label',
                    arguments: {
                        text: 'LEVEL',
                        fill: params.fontColor,
                        stroke: null,
                        fontSize: 32,
                        align: 'right'
                    },
                    x: this.gridX.span(8) - 8,
                    y: this.gridY.span(3) + 8,
                },
                levelLabel: {
                    className: 'Label',
                    arguments: {
                        text: params.level+'',
                        fill: params.fontColor,
                        stroke: null,
                        fontSize: 60,
                        align: 'left'
                    },
                    x: this.gridX.span(8) + 8,
                    y: this.gridY.span(3),
                },

                messageLabel: {
                    className: 'Label',
                    arguments: {
                        text: message,
                        fill: params.fontColor,
                        stroke: null,
                        fontSize: 32,
                    },
                    x: this.gridX.center(),
                    y: this.gridY.span(9),
                },

                shareButton: {
                    className: 'phina.ui.Button',
                    arguments: [{
                        text: '★',
                        width: 128,
                        height: 128,
                        fontColor: params.fontColor,
                        fontSize: 50,
                        cornerRadius: 64,
                        fill: 'rgba(240, 240, 240, 0.5)',
                        // stroke: '#aaa',
                        // strokeWidth: 2,
                    }],
                    x: this.gridX.center(-3),
                    y: this.gridY.span(12),
                },
                playButton: {
                    className: 'phina.ui.Button',
                    arguments: [{
                        text: '▶',
                        width: 128,
                        height: 128,
                        fontColor: params.fontColor,
                        fontSize: 50,
                        cornerRadius: 64,
                        fill: 'rgba(240, 240, 240, 0.5)',
                        // stroke: '#aaa',
                        // strokeWidth: 2,
                    }],
                    x: this.gridX.center(3),
                    y: this.gridY.span(12),

                    interactive: true,
                    onpush: function() {
                        this.exit();
                    }.bind(this),
                },
                presentsLabel: {
                    className: 'Label',
                    arguments: {
                        text: 'Presented by Lazy Cat Works.',
                        fill: params.fontColor,
                        stroke: null,
                        fontSize: 20,
                    },
                    x: this.gridX.center(),
                    y: this.gridY.span(15),
                },
            }
        });

        if (params.exitType === 'touch') {
            this.on('pointend', function() {
                this.exit();
            });
        }

        this.shareButton.onclick = function() {
            var text = 'Level: {0}, Score: {1}\n{2}'.format(params.level, params.score, params.title);
            var url = phina.social.Twitter.createURL({
                text: text,
                hashtags: params.hashtags,
                url: params.url,
            });
            window.open(url, 'share window', 'width=480, height=320');
        };
    },
    _static: {
        defaults: {
            score: 0,
            level: 1,

            message: 'Thank you for playing!',
            hashtags: 'phina_js,game,javascript',
            url: phina.global.location && phina.global.location.href,
        },
    },
});

// メイン処理
phina.main( function() {

    // アプリケーション生成
    var app = GameApp( {
        startLabel: 'title',
        title: 'collision with circle',
        version: 'Ver.1.0.0',
        fontColor: 'white',
        backgroundColor: 'black',
        backgroundImage: '',
        width: 640,
        height: 960,
    } );
    // アプリケーション実行
    app.fps = 60;
    app.run();
} );

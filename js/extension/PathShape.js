/* global phina */

PathShape.prototype.$method("collisionWithCircle", function(x, y, r) {
    var p3 = this.globalToLocal( Vector2(x, y) );

    // 頂点との接触判定
    let i = 0;
    let result = null;
    let n = this.paths.length;
    for (i=0; i<n; i++) {
        const d = this.paths[i].distance( p3 );
        if ( d <= r ) {
            result = {
                type: 'vertex',
                origin: Vector2(this.x, this.y),
                index: i,
                vertex: this.paths[i],
                circle: {
                    x: p3.x,
                    y: p3.y,
                    radius: r
                },
                error: r - d, // めり込み量
                distance: d
            };
        }
    }

    i = 1;
    if ( result != null ) {
        // 接触判定された頂点を含む線分に対してのみ処理する
        i = Math.max( 1, result.index ); // 頂点を含む線分の終点のindex
        n = Math.min( i + 2, this.paths.length ); // 頂点を含む線分の数は最大で2本
    }

    for (; i<n; i++) {
        const p0 = this.paths[i-1];
        const d1 = Vector2.sub( this.paths[i], p0 );
        const tmp = (d1.x * (p0.x - p3.x)) + (d1.y * (p0.y - p3.y));
        const t = -tmp / ((d1.y * d1.y) + (d1.x * d1.x));

        if ( 0 <= t && t <= 1 ) {
            // 円の中心から引いた垂線が線分と交差している場合
            const p2 = Vector2( p0.x + (d1.x * t), p0.y + (d1.y * t) );
            const d = p2.distance( p3 );
            if ( d <= r ) {
                const newResult = {
                    type: 'segment',
                    origin: Vector2(this.x, this.y),
                    index: i - 1,
                    p0: p0,
                    p1: this.paths[i],
                    p2: p2,
                    t: t,
                    circle: {
                        x: p3.x,
                        y: p3.y,
                        radius: r
                    },
                    error: r - d, // めり込み量
                    distance: d
                };

                // 線分と接触している場合は、線分との接触が優先して頂点との接触情報は破棄
                if ( result == null || result.type !== 'segment' ) {
                    result = newResult;
                    // 次の線分を判定して処理するようにループ回数を変更
                    n = Math.min( i + 2, this.paths.length );
                }
                else {
                    // TODO: 2つの線分に同時に接触している場合は、接触点の中心を返す？
                    return ( result.distance < newResult.distance ) ? result : newResult;
                }
            }
        }
    }

    return result;
  } );
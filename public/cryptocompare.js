/**
 * CryptoCompare API wrapper class.
 * Requires:
 *  axios - for ajax requests.
 *  socket.io - for live data stream.
 */
class CryptoCompare {

  /**
   * Constructor
   */
  constructor() {
    this._ws     = null;
    this._cb     = null;
    this._pairs  = {};  // pairs cache
    this._subs   = {};  // stream subs
    this._type   = '5'; // stream type
    this._fields = {
      'TYPE': 0x0,
      'MARKET': 0x0,
      'FROMSYMBOL': 0x0,
      'TOSYMBOL': 0x0,
      'FLAGS': 0x0,
      'PRICE': 0x1,
      'BID': 0x2,
      'OFFER': 0x4,
      'LASTUPDATE': 0x8,
      'AVG': 0x10,
      'LASTVOLUME': 0x20,
      'LASTVOLUMETO': 0x40,
      'LASTTRADEID': 0x80,
      'VOLUMEHOUR': 0x100,
      'VOLUMEHOURTO': 0x200,
      'VOLUME24HOUR': 0x400,
      'VOLUME24HOURTO': 0x800,
      'OPENHOUR': 0x1000,
      'HIGHHOUR': 0x2000,
      'LOWHOUR': 0x4000,
      'OPEN24HOUR': 0x8000,
      'HIGH24HOUR': 0x10000,
      'LOW24HOUR': 0x20000,
      'LASTMARKET': 0x40000,
    };
    this._initStream();
  }

  /**
   * Assign handler for stream data
   * @param {function}  callback  Handler function
   */
  onData( callback ) {
    this._cb = callback;
  }

  /**
   * Get top coins from api
   * @param {string}   base  Base currency
   * @param {boolean}  sub   Subscribe to stream
   */
  fetchTopCoins( base, sub ) {
    base = String( base || 'USD' ).toUpperCase();
    const endpoint = `https://min-api.cryptocompare.com/data/top/mktcapfull?limit=50&tsym=${base}`;

    axios.get( endpoint ).then( res => {
      if ( !Array.isArray( res.data.Data ) ) return;

      for ( let i = 0; i < res.data.Data.length; ++i ) {
        const info = res.data.Data[ i ].CoinInfo;
        const data = res.data.Data[ i ].RAW[ base ];
        const symb = data['FROMSYMBOL'];
        const pair = symb + base;

        // merge coin info and price data together and cache it locally
        this._pairs[ pair ] = this._pairs[ pair ] || {};
        this._subs[ pair ] = [ this._type, 'CCCAGG', symb, base ].join( '~' );
        Object.assign( this._pairs[ pair ], info, data );
      }
      // add fetched coins to stream subscription
      if ( sub === true ) this._initSubs();
    })
    .catch( err => console.error( err ) );
  }

  /**
   * Start listening for stream data
   */
  _initStream() {
    this._ws = io.connect( 'https://streamer.cryptocompare.com/' );
    this._ws.on( 'm', payload => {

      // unpack stream data for a pair
      const data = this._unpack( payload );
      const pair = data['FROMSYMBOL'] + data['TOSYMBOL'];

      // check a few things and merge data
      if ( data[ 'TYPE' ] !== this._type ) return;
      if ( !this._pairs.hasOwnProperty( pair ) ) return;
      Object.assign( this._pairs[ pair ], data );

      // calculate change and percent for last 1h
      const c01 = this._calcChange( this._pairs[ pair ]['OPENHOUR'], this._pairs[ pair ]['PRICE'] );
      this._pairs[ pair ]['CHANGEHOUR'] = c01.sign + c01.change;
      this._pairs[ pair ]['CHANGEPCTHOUR'] = c01.sign + c01.percent;

      // calculate change and percent for last 24h
      const c24 = this._calcChange( this._pairs[ pair ]['OPEN24HOUR'], this._pairs[ pair ]['PRICE'] );
      this._pairs[ pair ]['CHANGE24HOUR'] = c24.sign + c24.change;
      this._pairs[ pair ]['CHANGEPCT24HOUR'] = c24.sign + c24.percent;

      // finally pass pair data to callback
      if ( typeof this._cb === 'function' ) {
        this._cb( this._pairs );
      }
    });
  }

  /**
   * Send list of subscriptions to stream server
   */
  _initSubs() {
    if ( !this._ws ) return;
    const subs = Object.keys( this._subs ).map( pair => this._subs[ pair ] );
    this._ws.emit( 'SubAdd', { subs } );
  }

  /**
   * Calculate price change
   * @param {number}  last     Previous price
   * @param {number}  current  Current price
   */
  _calcChange( last, current ) {
    last    = parseFloat( last ) || 0;
    current = parseFloat( current ) || 0;

    let isnum   = Boolean( last > 0 );
    let isup    = Boolean( current >= last );
    let change  = isup  ? ( current - last ) : ( last - current );
    let percent = isnum ? ( change / last * 100.0 ) : 0.0;
    let sign    = isup  ? '+' : '-';
    let arrow   = isup  ? '▲' : '▼';
    let color   = isup  ? 'green' : 'red';
    return { change, percent, sign, arrow, color };
  }

  /**
   * Unpack data from cryptocompare socket stream
   * @param {string}  data  Websocket stream payload string
   */
  _unpack( data ) {
    let parts = String( data || '' ).split( '~' );
    let mask = parseInt( parts[ parts.length - 1 ], 16 );
    let output = {};
    let idx = 0;

    for ( let prop in this._fields ) {
      if ( this._fields[ prop ] === 0 || mask & this._fields[ prop ] ) {
        output[ prop ] = parts[ idx ];
        idx++;
      }
    }
    return output;
  }
}

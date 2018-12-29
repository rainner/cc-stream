/**
 * API tests
 */
const cc = {

  // ...
  _ws: null,
  _endpoint: 'https://streamer.cryptocompare.com/',
  _prices: {},
  _subs: [],

  // ...
  _symbols: {
    'BTC': 'Ƀ',
    'LTC': 'Ł',
    'DAO': 'Ð',
    'USD': '$',
    'CNY': '¥',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'PLN': 'zł',
    'RUB': '₽',
    'ETH': 'Ξ',
    'GOLD': 'Gold g',
    'INR': '₹',
    'BRL': 'R$'
  },

  // ...
  _types: {
    'TRADE': '0',
    'FEEDNEWS': '1',
    'CURRENT': '2',
    'LOADCOMPLATE': '3',
    'COINPAIRS': '4',
    'CURRENTAGG': '5',
    'TOPLIST': '6',
    'TOPLISTCHANGE': '7',
    'ORDERBOOK': '8',
    'FULLORDERBOOK': '9',
    'ACTIVATION': '10',
    'FULLVOLUME': '11',
    'TRADECATCHUP': '100',
    'NEWSCATCHUP': '101',
    'TRADECATCHUPCOMPLETE': '300',
    'NEWSCATCHUPCOMPLETE': '301'
  },

  // ...
  _flags: {
    'PRICEUP': 0x1,
    'PRICEDOWN': 0x2,
    'PRICEUNCHANGED': 0x4,
    'BIDUP': 0x8,
    'BIDDOWN': 0x10,
    'BIDUNCHANGED': 0x20,
    'OFFERUP': 0x40,
    'OFFERDOWN': 0x80,
    'OFFERUNCHANGED': 0x100,
    'AVGUP': 0x200,
    'AVGDOWN': 0x400,
    'AVGUNCHANGED': 0x800,
  },

  // ...
  _fields: {
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
  },

  // ...
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
  },

  // ...
  addSub( from, to ) {
    if ( !from || !to ) return;
    const sub = [ this._types.CURRENTAGG, 'CCCAGG', from, to ].join( '~' );
    this._subs.push( sub );
  },

  // ...
  connect( callback ) {
    this._ws = io.connect( this._endpoint );
    this._ws.emit( 'SubAdd', { subs: this._subs } );
    this._ws.on( 'm', payload => {

      const data = this._unpack( payload );
      const pair = data[ 'FROMSYMBOL' ] + data[ 'TOSYMBOL' ];

      if ( data[ 'TYPE' ] !== this._types.CURRENTAGG ) return;
      this._prices[ pair ] = this._prices[ pair ] || { 'PAIR': pair };

      for ( let key in data ) {
        if ( [ 'TYPE', 'MARKET', 'FLAGS', 'LASTTRADEID' ].indexOf( key ) >= 0 ) continue;
        if ( /^[\d\.]+$/.test( data[ key ] ) ) data[ key ] = Number( data[ key ] ).toFixed( 8 );
        this._prices[ pair ][ key ] = data[ key ];
      }
      callback( this._prices );
    });
  },
};

// vue setup
new Vue({
  el: '#app',

  data: {
    prices: {},
  },

  mounted() {
    cc.addSub( 'BTC', 'USD' );
    cc.addSub( 'XRP', 'USD' );
    cc.connect( prices => {
      this.prices = prices;
    });
  }
});





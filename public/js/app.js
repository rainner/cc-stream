/**
 * App
 */

// convert floating point value to fixed number
Vue.filter( 'toFixed', ( num, decimals ) => {
  decimals = Number( decimals ) || 0;
  return Number( num ).toFixed( decimals );
});

// convert large number to comma separated value
Vue.filter( 'toMoney', ( num, fixed ) => {
  num   = parseFloat( num ) || 0;
  fixed = parseInt( fixed ) || 0;
  let a = [ '', 'K', 'M', 'B', 'T', '', '', '' ];
  let o = { style: 'decimal', minimumFractionDigits: fixed, maximumFractionDigits: fixed };
  let n = new Intl.NumberFormat( 'en-US', o ).format( num );
  let p = n.split( ',' );
  return ( p.length ) ? n +' '+ a[ p.length - 1 ] : n;
});

// vue instance
new Vue({
  el: '#app',

  data: {
    ticker_quote: 'USD',
    ticker_limit: 50,
    ticker_data: {},
    ticker_search: '',
    ticker_sort: 'market_cap',
    ticker_order: 'desc',
  },

  computed: {

    // get currency symbol for quote
    curSymb() {
      switch ( this.ticker_quote ) {
        case 'USD': return '$';
        case 'BTC': return '₿';
      }
      return '';
    },

    // get ticker list
    tickerList() {
      let keys   = Object.keys( this.ticker_data );
      let search = String( this.ticker_search ).replace( /[^\w\-]+/g, ' ' ).replace( /\s\s+/g, ' ' ).trim();
      let rgex   = search ? new RegExp( '^'+ search, 'i' ) : null;
      let count  = keys.length;
      let list   = [];

      while ( count-- ) {
        const c = this.ticker_data[ keys[ count ] ];
        if ( rgex && !rgex.test( c.name +' '+ c.symbol ) ) continue;
        list.push( c );
      }
      list = this._sort( list, this.ticker_sort, this.ticker_order );
      return list;
    }
  },

  methods: {

    /**
     * Helper method for sorting a list.
     */
    _sort( list, key, order, ignore ) {
      return list.sort( ( a, b ) => {
        if ( a.hasOwnProperty( key ) ) {

          let _a = a[ key ];
          let _b = b[ key ];

          if ( ignore ) { // sort strings using same case
            _a = ( typeof _a === 'string' ) ? _a.toUpperCase() : _a;
            _b = ( typeof _b === 'string' ) ? _b.toUpperCase() : _b;
          }
          if ( order === 'asc' ) {
            if ( _a < _b ) return -1;
            if ( _a > _b ) return 1;
          }
          if ( order === 'desc' ) {
            if ( _a > _b ) return -1;
            if ( _a < _b ) return 1;
          }
        }
        return 0;
      });
    },

    /**
     * Fetch managed list of coins from backend.
     * This is the main method that creates the list
     * of coins that will be displayed on the page.
     */
    fetchCoinsList() {
      const request = {
        method: 'GET',
        url: 'public/static/coins.json', // change me
        responseType: 'json',
      }
      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;
        let ticker = {};

        for ( let i = 0; i < res.data.length; ++i ) {
          const coin = new Coin();
          coin.setCoinData( res.data[ i ] );
          ticker[ coin.uniq ] = coin;
        }
        // update ticker data then move on to next step
        this.ticker_data = ticker;
        this.fetchCoinPaprika();

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Fetch ticker data from coinpaprika.
     * This will fetch new data for each coin and
     * merge with the existing list of coins here.
     */
    fetchCoinPaprika() {
      const quote = this.ticker_quote;
      const request = {
        method: 'GET',
        url: 'https://api.coinpaprika.com/v1/tickers?quotes=' + quote,
        responseType: 'json',
      }
      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;
        let ticker = Object.assign( {}, this.ticker_data );

        for ( let i = 0; i < res.data.length; ++i ) {
          const coin = res.data[ i ];
          const nums = coin.quotes[ quote ];
          const uniq = String( coin.name ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();

          if ( !ticker.hasOwnProperty( uniq ) ) continue;
          const { name, symbol, rank, circulating_supply, max_supply } = coin;
          const { price, volume_24h, market_cap, percent_change_24h } = nums;

          ticker[ uniq ].setCoinData( { name, symbol, quote } );
          ticker[ uniq ].setTickerData( { price, circulating_supply, max_supply, volume_24h, market_cap, percent_change_24h, rank } );
        }
        // update ticker data and fetch again after a minute
        this.ticker_data = ticker;
        setTimeout( this.fetchCoinPaprika, 1000 * 60 );

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Start live stream to coincap api.
     * This stream gets live prices for coins
     * that can be merged with the list of coins here.
     */
    initCoincapStream() {
      const ws = new WebSocket( 'wss://ws.coincap.io/prices?assets=ALL' );

      ws.addEventListener( 'open', e => {
        console.info( 'WebSocket-Open', e );
      });
      ws.addEventListener( 'close', e => {
        console.info( 'WebSocket-Close', e );
        setTimeout( this.initCoincapStream, 1000 * 5 );
      });
      ws.addEventListener( 'error', e => {
        console.warn( 'WebSocket-Error', e );
      });
      ws.addEventListener( 'message', e => {
        const data = JSON.parse( e.data ) || {};

        for ( let uniq in data ) {
          const price = data[ uniq ];
          const coin  = this.ticker_data[ uniq ] || null;

          if ( !coin ) continue;
          coin.setTickerData( { price } );
        }
      });
    },

  },

  mounted() {
    this.fetchCoinsList();
    this.initCoincapStream();
  }
});





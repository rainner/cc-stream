/**
 * App
 */
new Vue({
  el: '#app',

  // app data
  data: {
    coindata: {},
    quote: 'dollar',
    quotes: {
      'dollar': { prefix: '$', symbol: 'USD', price: 1 },
      'bitcoin': { prefix: '₿', symbol: 'BTC', price: 0 },
      'litecoin': { prefix: 'Ł', symbol: 'LTC', price: 0 },
      'ethereum': { prefix: 'Ξ', symbol: 'ETH', price: 0 },
    },
    // filter options
    limit: 50,
    search: '',
    order: 'desc',
    sort: 'market_cap',
    sortdata: [
      { column: 'price', name: 'Current price' },
      { column: 'percent_change_24h', name: 'Change 24H' },
      { column: 'volume_24h', name: 'Volume 24H' },
      { column: 'market_cap', name: 'Market cap' },
      { column: 'circulating_supply', name: 'Supply' },
    ],
  },

  // custom filters
  filters: {

    /**
     * Convert floating point value to fixed number.
     */
    toFixed( num, decimals ) {
      decimals = Number( decimals ) || 0;
      return Number( num ).toFixed( decimals );
    },

    /**
     * Convert large number to comma separated value.
     */
    toMoney( num, fixed ) {
      num   = parseFloat( num ) || 0;
      fixed = parseInt( fixed ) || 0;
      let a = [ '', 'K', 'M', 'B', 'T', '', '', '' ];
      let o = { style: 'decimal', minimumFractionDigits: fixed, maximumFractionDigits: fixed };
      let n = new Intl.NumberFormat( 'en-US', o ).format( num );
      let p = n.split( ',' );
      return ( p.length ) ? n +' '+ a[ p.length - 1 ] : n;
    },
  },

  // computed methods
  computed: {

    /**
     * Get filtered ticker list to display
     */
    tickerList() {
      let keys   = Object.keys( this.coindata );
      let search = String( this.search ).replace( /[^\w\-]+/g, ' ' ).replace( /\s\s+/g, ' ' ).trim();
      let rgex   = search ? new RegExp( search, 'i' ) : null;
      let count  = keys.length;
      let list   = [];

      while ( count-- ) {
        const c = this.coindata[ keys[ count ] ];
        // apply search filtering if needed
        if ( rgex && !rgex.test( c.symbol +' '+ c.name ) ) continue;
        // convert price to base quote value
        c.value = this._convert( c.price );
        // add to output list
        list.push( c );
      }
      // apply list sorting
      list = this._sort( list, this.sort, this.order );
      return list;
    }
  },

  // custom methods
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
     * Convert coin USD value to current quote currency selected.
     */
    _convert( usdval ) {
      usdval = Number( usdval );
      const q = this.quotes[ this.quote ] || null;

      if ( !q || !q.price || q.symbol === 'USD' ) {
        return '$ '+ usdval.toFixed( 3 );
      }
      const value = Number( ( 100000000 / q.price ) * usdval ) / 100000000;
      return q.prefix +' '+ value.toFixed( 8 );
    },

    /**
     * Used to change the base quote value from a form.
     */
    onQuoteChange( e ) {
      this.quote = e.target.value;
    },

    /**
     * Used to change the list sorting column.
     */
    onSortChange( e ) {
      this.sort = e.target.value;
    },

    /**
     * Set the base quote price used to calculate
     * coin value in different currencies.
     */
    updateQuotePrice( uniq, price ) {
      if ( !this.quotes.hasOwnProperty( uniq ) ) return;
      this.quotes[ uniq ].price = Number( price );
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
        let coins = {};

        for ( let i = 0; i < res.data.length; ++i ) {
          const coin = new Coin();
          coin.setData( res.data[ i ] );
          coins[ coin.uniq ] = coin;
        }
        // update ticker data then move on to next step
        this.coindata = coins;
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
      const quote = 'USD';
      const request = {
        method: 'GET',
        url: 'https://api.coinpaprika.com/v1/tickers?quotes='+ quote,
        responseType: 'json',
      }
      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;

        let coins = Object.assign( {}, this.coindata );
        let count = res.data.length;

        while ( count-- ) {
          let coin = res.data[ count ];
          let nums = coin.quotes[ quote ];
          let uniq = String( coin.name ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();

          if ( uniq === 'xrp' ) uniq = 'ripple';
          if ( !coins.hasOwnProperty( uniq ) ) continue;

          let { id, name, symbol, rank, circulating_supply, max_supply } = coin;
          let { price, volume_24h, market_cap, percent_change_24h } = nums;
          let chart_url = `https://graphs.coinpaprika.com/currency/chart/${ id }/7d/svg`;

          this.updateQuotePrice( uniq, price );
          coins[ uniq ].setData( { name, symbol, quote } );
          coins[ uniq ].updateTicker( { price, rank, circulating_supply, max_supply, volume_24h, market_cap, percent_change_24h, chart_url } );
        }
        // update ticker data and fetch again after a minute
        setTimeout( this.fetchCoinPaprika, 1000 * 60 );
        this.coindata = coins;

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
      ws.addEventListener( 'error',   e => console.error( 'WebSocket-Error', e ) );
      ws.addEventListener( 'close',   e => setTimeout( this.initCoincapStream, 1000 * 5 ) );
      ws.addEventListener( 'message', e => {
        const data = JSON.parse( e.data ) || {};

        for ( let uniq in data ) {
          const coin  = this.coindata[ uniq ] || null;
          const price = data[ uniq ];

          this.updateQuotePrice( uniq, price );
          if ( coin ) coin.updateTicker( { price } );
        }
      });
    },

  },

  // app maunted
  mounted() {
    this.fetchCoinsList();
    this.initCoincapStream();
  }
});





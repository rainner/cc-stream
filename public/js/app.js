/**
 * Line chart component
 */
Vue.component( 'linechart', {
  props: {
    width: { type: Number, default: 400, required: true },
    height: { type: Number, default: 40, required: true },
    values: { type: Array, default: [], required: true },
  },
  computed: {
    viewBox() {
      return '0 0 '+ this.width +' '+ this.height;
    },
    chartPoints() {
      let data = this.getPoints();
      let list = data.map( d => ( d.x - 10 ) +','+ d.y );
      return list.join( ' ' );
    },
  },
  methods: {
    getPoints() {
      this.width  = parseFloat( this.width ) || 0;
      this.height = parseFloat( this.height ) || 0;
      let min     = this.values.reduce( ( min, val ) => val < min ? val : min, this.values[ 0 ] );
      let max     = this.values.reduce( ( max, val ) => val > max ? val : max, this.values[ 0 ] );
      let len     = this.values.length;
      let half    = this.height / 2;
      let range   = ( max > min ) ? ( max - min ) : this.height;
      let gap     = ( len > 1 ) ? ( this.width / ( len - 1 ) ) : 1;
      let points  = [];

      for ( let i = 0; i < len; ++i ) {
        let d = this.values[ i ];
        let val = 2 * ( ( d - min ) / range - 0.5 );
        let x = i * gap;
        let y = -val * half * 0.8 + half;
        points.push( { x, y } );
      }
      return points;
    }
  },
  template: `
  <svg :viewBox="viewBox" xmlns="http://www.w3.org/2000/svg">
    <polyline class="color" fill="none" stroke-width="1.5" stroke-linecap="round" :points="chartPoints" />
  </svg>`,
});

/**
 * Vue app instance
 */
new Vue({
  el: '#app',

  // app data
  data: {

    // cached coins data is stored here
    coindata: {},

    // these are used for base currency conversion
    quote: 'dollar',
    quotes: {
      'dollar': { prefix: '$', symbol: 'USD', price: 1 },
      'bitcoin': { prefix: '₿', symbol: 'BTC', price: 0 },
      'ethereum': { prefix: 'Ξ', symbol: 'ETH', price: 0 },
    },

    // these are used for searching, filtering and pagination
    search: '',
    sort: 'market_cap',
    order: 'desc',
    pages: 1,
    page: 1,
    limit: 20,
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

      // build list and apply search filter
      while ( count-- ) {
        const c = this.coindata[ keys[ count ] ];
        if ( rgex && !rgex.test( c.symbol +' '+ c.name ) ) continue;
        c.value = this._convert( c.price );
        list.push( c );
      }
      // calculate pagination
      let total  = list.length;
      let start  = ( this.page - 1 ) * this.limit;
      let end    = ( start + this.limit );
      this.pages = ( total > this.limit ) ? Math.ceil( total / this.limit ) : 1;

      // final filtered list
      list = this._sort( list, this.sort, this.order );
      list = list.slice( start, end );
      return list;
    },

    /**
     * Get pagination buttons list
     */
    pagesList() {
      let list = [];

      for ( let i = 0; i < this.pages; ++i ) {
        const page = ( i + 1 );
        const active = ( page === this.page );
        list.push( { page, active } );
      }
      return list;
    },
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
     * Used to convert coin name into unique identifier
     */
    _uniq( name ) {
      return String( name ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();
    },

    /**
     * Used to change list page and jump to top;
     */
    goPage( page ) {
      this.page = parseInt( page );
      window.scrollTo( 0, 0 );
    },

    /**
     * Apply sorting and toggle order
     */
    sortBy( key, order ) {
      if ( this.sort !== key ) { this.order = order || 'asc'; }
      else { this.order = ( this.order === 'asc' ) ? 'desc' : 'asc'; }
      this.sort = key;
    },

    /**
     * Used to change the base quote value from a form.
     */
    onQuoteChange( e ) {
      this.quote = e.target.value;
    },

    /**
     * Set the base quote price used to calculate conversions.
     */
    updateQuotePrice( uniq, price ) {
      if ( !this.quotes.hasOwnProperty( uniq ) ) return;
      this.quotes[ uniq ].price = Number( price );
    },

    /**
     * Fetch managed list of coins from backend.
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
          let data = res.data[ i ];
          let { id, name, symbol, image } = data;
          let uniq = this._uniq( name );
          let coin = this.coindata[ uniq ] || new Coin();

          coin.setData( { id, name, symbol, image } );
          coins[ uniq ] = coin;
        }
        this.coindata = coins;
        this.fetchCoinPaprika();

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Fetch ticker data from coinpaprika.
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

        // only the top 100 coins by rank
        res.data = this._sort( res.data, 'rank', 'asc' );
        res.data.splice( 100 );
        let coins = {};

        for ( let i = 0; i < res.data.length; ++i ) {
          let data = res.data[ i ];
          let nums = data.quotes[ quote ];
          let uniq = this._uniq( data.name );
          let coin = this.coindata[ uniq ] || new Coin();

          let { id, name, symbol, rank, circulating_supply, max_supply } = data;
          let { price, volume_24h, market_cap, percent_change_1h, percent_change_24h, percent_change_7d } = nums;
          let graph_7d_url = `https://graphs.coinpaprika.com/currency/chart/${ id }/7d/svg`;

          this.updateQuotePrice( uniq, price );
          coin.setData( { id, uniq, name, symbol, quote } );
          coin.updateTicker( { price, rank, circulating_supply, max_supply, volume_24h, market_cap, percent_change_1h, percent_change_24h, percent_change_7d, graph_7d_url } );
          coins[ uniq ] = coin;
        }
        // update ticker data and fetch again after a minute
        setTimeout( this.fetchCoinPaprika, 1000 * 60 );
        this.coindata = coins;

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Update price of coins from alternative stream api if possible.
     */
    initCoincapStream() {
      const ws = new WebSocket( 'wss://ws.coincap.io/prices?assets=ALL' );
      ws.addEventListener( 'error', e => console.error( 'WebSocket-Error', e ) );
      ws.addEventListener( 'close', e => setTimeout( this.initCoincapStream, 1000 * 5 ) );
      ws.addEventListener( 'message', e => {
        const data = JSON.parse( e.data ) || {};

        for ( let uniq in data ) {
          const price = data[ uniq ];
          this.updateQuotePrice( uniq, price );

          if ( uniq === 'ripple' ) uniq = 'xrp';
          const coin = this.coindata[ uniq ] || null;

          if ( !coin ) continue;
          coin.updateTicker( { price } );
          coin.updateLiveGraph( price );
        }
      });
    },

  },

  // app maunted
  mounted() {
    this.fetchCoinPaprika();
    this.initCoincapStream();
  }
});





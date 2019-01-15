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
    tab: 'coins', // coins, rates, social
    sort: 'market_cap',
    order: 'desc',
    pages: 1,
    page: 1,
    limit: 20,
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
     * Used to convert coin name into unique identifier
     */
    _uniq( name ) {
      return String( name ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();
    },

    /**
     * Check if a tab is selected
     */
    isTab( tab ) {
      return ( this.tab === tab );
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
     * Toggle fav for a coin and save to store
     */
    toggleFav( uniq, isfav ) {
      let coin = this.coindata[ uniq ] || null;
      let data = {};

      if ( coin ) coin.setFavorite( !isfav );

      for ( let id in this.coindata ) {
        let toggle = this.coindata[ id ].isfav ? true : false;
        if ( toggle ) data[ id ] = toggle;
      }
      window.localStorage.setItem( 'fav_coins_data', JSON.stringify( data ) );
    },

    /**
     * Load saved favs from store
     */
    loadFavs() {
      let json = window.localStorage.getItem( 'fav_coins_data' ) || '{}';
      let data = JSON.parse( json );

      for ( let uniq in data ) {
        let coin = this.coindata[ uniq ] || null;
        if ( coin ) coin.setFavorite( data[ uniq ] );
      }
    },

    /**
     * Used to change the base quote value from a form.
     */
    onQuoteChange( e ) {
      this.quote = e.target.value;
      this.resetLiveGraphs();
    },

    /**
     * Used to change the current active tab
     */
    onTabChange( e ) {
      this.tab = e.target.value;
    },

    /**
     * Set the base quote price used to calculate conversions.
     */
    updateQuotePrice( uniq, price ) {
      if ( !this.quotes.hasOwnProperty( uniq ) ) return;
      this.quotes[ uniq ].price = Number( price );
    },

    /**
     * Used to reset live graphs on all coins.
     */
    resetLiveGraphs() {
      let q = this.quotes[ this.quote ];
      let keys = Object.keys( this.coindata );
      let count = keys.length;

      while ( count-- ) {
        let coin = this.coindata[ keys[ count ] ];
        coin.convertPrice( q.symbol, q.price, q.prefix );
        coin.flushLiveGraph();
      }
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

        let q = this.quotes[ this.quote ];
        let coins = {};

        // only the top 100 coins by rank
        res.data = this._sort( res.data, 'rank', 'asc' );
        res.data.splice( 100 );

        for ( let i = 0; i < res.data.length; ++i ) {
          let data = res.data[ i ];
          let nums = data.quotes[ quote ];
          let uniq = this._uniq( data.name );
          let coin = this.coindata[ uniq ] || new Coin();

          // coin data from api for each coin
          let { id, name, symbol, rank, circulating_supply, max_supply } = data;
          let { price, ath_price, volume_24h, market_cap, percent_change_1h, percent_change_24h, percent_change_7d, percent_change_30d, percent_change_1y } = nums;

          // keep selected conversion quote price updated
          this.updateQuotePrice( uniq, price );

          // update coin data and convert price
          coin.setData( { id, uniq, name, symbol, quote } );
          coin.updateTicker( { rank, price, ath_price, circulating_supply, max_supply, volume_24h, market_cap, percent_change_1h, percent_change_24h, percent_change_7d, percent_change_30d, percent_change_1y } );
          coin.convertPrice( q.symbol, q.price, q.prefix );
          coins[ uniq ] = coin;
        }

        // update ticker data and load more data
        this.coindata = coins;
        this.fetchSocialData();
        this.loadFavs();

        // fetch again after a minute
        setTimeout( this.fetchCoinPaprika, 1000 * 60 );

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Fetch and set social site subs count for each coin
     */
    fetchSocialData() {
      const request = {
        method: 'GET',
        url: 'php/coinsdata.json',
        responseType: 'json',
      }

      axios( request ).then( res => {
        if ( typeof res.data !== 'object' ) return;

        for ( let id in res.data ) {
          let data   = res.data[ id ];
          let uniq   = this._uniq( data.name || '' );
          let coin   = this.coindata[ uniq ] || null;
          let social = data.social || null;

          if ( !coin || !social ) continue;
          let twitter_subs  = ( social.twitter )  ? social.twitter.subs  : 0;
          let reddit_subs   = ( social.reddit )   ? social.reddit.subs   : 0;
          let github_subs   = ( social.github )   ? social.github.subs   : 0;
          let telegram_subs = ( social.telegram ) ? social.telegram.subs : 0;
          coin.updateSubs( { twitter_subs, reddit_subs, github_subs, telegram_subs } );
        }

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

        let q = this.quotes[ this.quote ];
        let data = JSON.parse( e.data ) || {};

        for ( let uniq in data ) {
          const price = data[ uniq ];

          // keep selected conversion quote price updated
          this.updateQuotePrice( uniq, price );

          // look for coin by unique name
          if ( uniq === 'ripple' ) uniq = 'xrp';
          const coin = this.coindata[ uniq ] || null;
          if ( !coin ) continue;

          // update coin data and convert price
          coin.updateTicker( { price } );
          coin.convertPrice( q.symbol, q.price, q.prefix );
          coin.updateLiveGraph();
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





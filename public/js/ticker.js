/**
 * Vue coin ticker app instance
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

    // these are used for searching and sorting
    tab: 'coins', // coins, rates, social
    search: '',
    favs: false,
    sort: {
      top: [ 'percent_change_24h', 'desc' ],
      ticker: [ 'market_cap', 'desc' ],
    },

    // these are used for pagination
    pages: 1,
    page: 1,
    limit: 20,
  },

  // computed methods
  computed: {

    /**
     * Check if there are coins loaded
     */
    hasCoins() {
      let count = Object.keys( this.coindata ).length;
      return count ? true : false;
    },

    /**
     * Check if there are favorite coins
     */
    hasFavs() {
      let count = 0;

      for ( let uniq in this.coindata ) {
        const c = this.coindata[ uniq ];
        if ( c.isfav ) count++;
      }
      return count ? true : false;
    },

    /**
     * Get filtered top 5 coins
     */
    topList() {
      let [ sort, order ] = this.sort.top;
      let keys  = Object.keys( this.coindata );
      let count = keys.length;
      let list  = [];

      while ( count-- ) {
        const c = this.coindata[ keys[ count ] ];
        list.push( c );
      }
      list = this.$utils.sort( list, sort, order );
      list = list.slice( 0, 5 );
      return list;
    },

    /**
     * Get filtered ticker list to display
     */
    tickerList() {
      let [ sort, order ] = this.sort.ticker;
      let search = String( this.search ).replace( /[^\w\-]+/g, ' ' ).replace( /\s\s+/g, ' ' ).trim();
      let rgex   = search ? new RegExp( search, 'i' ) : null;
      let keys   = Object.keys( this.coindata );
      let count  = keys.length;
      let list   = [];

      // build list and apply search filter
      while ( count-- ) {
        const c = this.coindata[ keys[ count ] ];
        if ( rgex && !rgex.test( c.symbol +' '+ c.name ) ) continue;
        if ( this.favs && !c.isfav ) continue;
        list.push( c );
      }
      // calculate pagination
      let total  = list.length;
      let start  = ( this.page - 1 ) * this.limit;
      let end    = ( start + this.limit );
      this.pages = ( total > this.limit ) ? Math.ceil( total / this.limit ) : 1;

      // final filtered list
      list = this.$utils.sort( list, sort, order );
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
     * Check if a tab is selected
     */
    isTab( tab ) {
      return ( this.tab === tab );
    },

    /**
     * Change current tab
     */
    setTab( tab ) {
      tab = String( tab || '' ).replace( /[^\w\-]+/g, '' );
      this.tab = ( /^(coins|rates|social)$/.test( tab ) ) ? tab : 'coins';
    },

    /**
     * Used to change the current active tab
     */
    onTabChange( e ) {
      this.setTab( e.target.value );
    },

    /**
     * Used to change list page and jump to top;
     */
    goPage( page ) {
      this.page = parseInt( page );
      window.scrollTo( 0, 0 );
    },

    /**
     * Apply sorting to the top list
     */
    sortTop( key, dir ) {
      this.sort.top = [ key, dir ];
    },

    /**
     * Apply sorting to the ticker
     */
    sortTicker( key, dir ) {
      let [ sort, order ] = this.sort.ticker;
      if ( sort !== key ) { order = dir || 'asc'; }
      else { order = ( order === 'asc' ) ? 'desc' : 'asc'; }
      this.sort.ticker = [ key, order ];
    },

    /**
     * Used to toggle showing only favs
     */
    sortFavs( toggle ) {
      this.favs = ( typeof toggle === 'boolean' ) ? toggle : false;
    },

    /**
     * Used to toggle showing only favs
     */
    toggleFavs() {
      this.favs = !this.favs;
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
        coin.setData( { quote: q.symbol } );
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
        res.data = this.$utils.sort( res.data, 'rank', 'asc' );
        res.data.splice( 100 );

        for ( let i = 0; i < res.data.length; ++i ) {
          let data = res.data[ i ];
          let nums = data.quotes[ quote ];
          let uniq = this.$utils.uniq( data.name );
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
          let uniq   = this.$utils.uniq( data.name || '' );
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
    this.setTab( window.location.hash );
    window.addEventListener( 'hashchange', e => this.setTab( location.hash ) );
  },

});





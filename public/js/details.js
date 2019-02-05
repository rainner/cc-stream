/**
 * Vue coin page app instance
 */
Vue.use( VueAwesomeSwiper );

new Vue({
  el: '#app',

  // app data
  data: {

    // coin data
    coinid: 'btc-bitcoin',
    coin: new Coin(),

    // events api data
    eventsData: [],
    eventsOptions: {
      slidesPerView: 5,
      spaceBetween: 30,
      pagination: {
        el: '.swiper-pagination',
        clickable: true
      }
    },

    // historical api data
    historyData: [],
    historyStart: 0,
    historyPages: 1,
    historyPage: 1,
    historyShow: 10,
    historyLimit: 50,
    historyInterval: '1d',
    historyTimes: {
      '1h'   : 3600,
      '1d'   : 86400,
      '7d'   : 604800,
      '30d'  : 2419200,
      '365d' : 31536000,
    },

    // exchanges api data
    exchangesData: {},

    // markets api data
    marketsData: {},
    marketsPages: 1,
    marketsPage: 1,
    marketsShow: 100,
  },

  // watch methods
  watch: {

    /**
     * Refetch coin data when id changes
     */
    coinid() {
      this.initCoinData();
    }
  },

  // computed methods
  computed: {

    /**
     * Get filtered historical list to display
     */
    historyList() {
      let list   = this.historyData.slice();
      let total  = list.length;
      let start  = ( this.historyPage - 1 ) * this.historyShow;
      let end    = ( start + this.historyShow );

      this.historyPages = ( total > this.historyShow ) ? Math.ceil( total / this.historyShow ) : 1;
      list = list.slice( start, end );
      return list;
    },

    /**
     * Get pagination buttons list
     */
    historyPagesList() {
      let list = [];

      for ( let i = 0; i < this.historyPages; ++i ) {
        const page = ( i + 1 );
        const active = ( page === this.historyPage );
        list.push( { page, active } );
      }
      return list;
    },

    /**
     * Get list of markets
     */
    marketsList() {
      let list  = Object.values( this.marketsData );

      // calculate pagination
      let total = list.length;
      let start = ( this.marketsPage - 1 ) * this.marketsShow;
      let end   = ( start + this.marketsShow );
      this.marketsPages = ( total > this.marketsShow ) ? Math.ceil( total / this.marketsShow ) : 1;

      // sort and slice the list
      list = this.$utils.sort( list, 'total_volume', 'desc' );
      list = list.slice( start, end );
      return list;
    },

    /**
     * Get pagination buttons list
     */
    marketsPagesList() {
      let list = [];

      for ( let i = 0; i < this.historyPages; ++i ) {
        const page = ( i + 1 );
        const active = ( page === this.historyPage );
        list.push( { page, active } );
      }
      return list;
    },
  },

  // custom methods
  methods: {

    /**
     * Set coin id
     */
    setId( coinid ) {
      this.coinid = coinid;
    },

    /**
     * Fetch and load coin data
     */
    initCoinData() {
      this.fetchCoin();
      this.fetchEvents();
      this.fetchHistory();
      // this.fetchExchanges();
      this.fetchMarkets();
    },

    /**
     * Update price of coins from alternative stream api if possible.
     */
    initCoincapStream() {
      const ws = new WebSocket( 'wss://ws.coincap.io/prices?assets=ALL' );
      ws.addEventListener( 'error', e => console.error( 'WebSocket-Error', e ) );
      ws.addEventListener( 'close', e => setTimeout( this.initCoincapStream, 1000 * 5 ) );
      ws.addEventListener( 'message', e => {

        let data = JSON.parse( e.data ) || {};

        for ( let uniq in data ) {
          if ( uniq === 'ripple' ) uniq = 'xrp';
          if ( uniq !== this.coin.uniq ) continue;
          this.coin.updateTicker( { price: data[ uniq ] } );
        }
      });
    },

    /**
     * Get pagation list
     */
    getPagesList( total, current ) {
      total    = Number( total ) || 0;
      current  = Number( current ) || 0;
      let list = [];

      for ( let i = 0; i < total; ++i ) {
        const page = ( i + 1 );
        const active = ( page === current );
        list.push( { page, active } );
      }
      return list;
    },

    /**
     * Set the history list page
     */
    setPage( name, page ) {
      this[ name ] = parseInt( page );
    },

    /**
     *
     */
    toggleMarketsGroup( pair ) {
      let { active } = this.marketsData[ pair ];
      this.marketsData[ pair ].active = !active;
    },

    /**
     * Wrapper for creating date strings
     */
    getDate( time, full ) {
      let date = ( time instanceof Date ) ? time : new Date( time || Date.now() );
      let { month, day, year, hour, minute, second, ampm } = this.$utils.parseTime( date );
      let fulldate = `${month}/${day}/${year}`;
      let fulltime = `${hour}:${minute}:${second} ${ampm}`;

      if ( full ) return fulldate +' - '+ fulltime;
      return fulldate;
    },

    /**
     * Fetch coin data
     */
    fetchCoin() {
      const quote = 'USD';
      const request = {
        method: 'GET',
        url: `https://api.coinpaprika.com/v1/tickers/${ this.coinid }?quotes=${ quote }`,
        responseType: 'json',
      }

      axios( request ).then( res => {

        let data = res.data;
        let nums = data.quotes[ quote ];
        let uniq = this.$utils.uniq( data.name );
        let { id, name, symbol, rank, circulating_supply, max_supply } = data;
        let { price, ath_price, volume_24h, market_cap, percent_change_1h, percent_change_24h, percent_change_7d, percent_change_30d, percent_change_1y } = nums;

        this.coin.setData( { id, uniq, name, symbol, quote } );
        this.coin.updateTicker( { rank, price, ath_price, circulating_supply, max_supply, volume_24h, market_cap, percent_change_1h, percent_change_24h, percent_change_7d, percent_change_30d, percent_change_1y } );

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Fetch list of events
     */
    fetchEvents() {
      const request = {
        method: 'GET',
        url: `https://api.coinpaprika.com/v1/coins/${ this.coinid }/events`,
        responseType: 'json',
      }

      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;

        let events = res.data;
        let today  = new Date();
        let index  = 0;

        for ( let i = 0; i < events.length; ++i ) {

          let e      = events[ i ];
          let edate  = new Date( e.date );
          let offset = ( today - edate );

          e.done     = ( offset > 0 ) ? true : false;
          e.datestr  = this.getDate( edate );

          if ( !index && !e.done ) { index = i; }
        }

        let start = ( index > 1 ) ? ( index - 2 ) : 0;
        events.splice( 0, start );
        this.eventsData = events;

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Fetch list of historical prices
     */
    fetchHistory() {
      const time       = this.historyTimes[ this.historyInterval ];
      const interval   = this.historyInterval;
      const limit      = this.historyLimit;
      const start      = Math.floor( Date.now() / 1000 ) - ( time * limit );
      const query      = this.$utils.queryStr( { start, interval, limit } );
      const request    = {
        method: 'GET',
        url: `https://api.coinpaprika.com/v1/tickers/${ this.coinid }/historical?${ query }`,
        responseType: 'json',
      }

      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;

        for ( let e of res.data ) {
          e.date = this.getDate( e.timestamp, ( interval === '1h' ) );
        }
        this.historyData = res.data;

       }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Fetch exchanges data
     */
    fetchExchanges() {
      const request = {
        method: 'GET',
        url: `https://api.coinpaprika.com/v1/coins/${ this.coinid }/exchanges`,
        responseType: 'json',
      }

      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;

        let list      = res.data;
        let count     = list.length;
        let exchanges = {};

        while ( count-- ) {
          let { id, name, adjusted_volume_24h_share } = list[ count ];
          exchanges[ id ] = { name, adjusted_volume_24h_share, markets: {} };
        }
        // console.log( exchanges );
        this.exchangesData = exchanges;

      }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Fetch markets data
     */
    fetchMarkets() {
      const quote   = 'USD';
      const request = {
        method: 'GET',
        url: `https://api.coinpaprika.com/v1/coins/${ this.coinid }/markets?quotes=${ quote }`,
        responseType: 'json',
      }

      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;

        let list    = res.data;
        let count   = list.length;
        let markets = {};

        while ( count-- ) {
          // api data
          let { exchange_id, exchange_name, pair, market_url, adjusted_volume_24h_share } = list[ count ];
          let { price, volume_24h } = list[ count ].quotes[ quote ];

          // skip exchanges with low volume
          if ( volume_24h < 1000 ) continue;

          // init market group data
          if ( !markets[ pair ] ) {
            markets[ pair ] = { pair, total_share: 0, total_volume: 0, total_exchanges: 0, average_price: 0, exchanges: {}, active: false };
          }
          // add up some values
          if ( !markets[ pair ].exchanges[ exchange_id ] ) {
            markets[ pair ].total_exchanges += 1;
            markets[ pair ].average_price += price;
          }
          // build group data
          markets[ pair ].total_share += adjusted_volume_24h_share;
          markets[ pair ].total_volume += volume_24h;
          markets[ pair ].exchanges[ exchange_id ] = {
            pair,
            exchange_id,
            exchange_name,
            market_url,
            price,
            volume_24h,
          };
        }

        // finalize some things
        for ( let pair in markets ) {

          // calculare average market price from total exchanges
          let { average_price, total_exchanges } = markets[ pair ];
          markets[ pair ].average_price = ( average_price / total_exchanges );

          // sort list of exchanges by volume
          let exchanges = Object.values( markets[ pair ].exchanges );
          exchanges = this.$utils.sort( exchanges, 'volume_24h', 'desc' );
          markets[ pair ].exchanges = exchanges;
        }

        // console.log( markets );
        this.marketsData = markets;

       }).catch( err => {
        console.warn( err );
      });
    },

  },

  // app maunted
  mounted() {
    this.initCoinData();
    this.initCoincapStream();
  },

});

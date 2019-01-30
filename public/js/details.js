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

    // trades api data
    tradesData: [],
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
    },

    /**
     * Wrapper for creating date strings
     */
    getDate( time ) {
      let date = ( time instanceof Date ) ? time : new Date( time || Date.now() );
      let { month, day, year } = this.$utils.parseTime( date );
      return `${month}, ${day}, ${year}`;
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
        console.log( res.data );

        if ( !Array.isArray( res.data ) ) return;

        for ( let e of res.data ) {
          e.date = this.getDate( e.timestamp );
        }
        this.historyData = res.data;

       }).catch( err => {
        console.warn( err );
      });
    },

    /**
     * Set the history list page
     */
    setHistoryPage( page ) {
      this.historyPage = parseInt( page );
    },

  },

  // app maunted
  mounted() {
    this.initCoinData();
  },

});

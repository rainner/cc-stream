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
    ws: null,

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

    // chart data
    chartData: [],
    chartTime: 86400,
    chartInterval: '5m',
    chartLimit: 1000,
    chartPrice: null,
    chartVolume: null,
    chartBusy: false,

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
    exchangesSearch: '',
    exchangesPages: 1,
    exchangesPage: 1,
    exchangesShow: 10,

    // markets api data
    marketsData: {},
    marketsBlacklist: [], // skip exchange ids
    marketsMinVol: 1000, // skip exchange vol below
    marketsSearch: '',
    marketsPages: 1,
    marketsPage: 1,
    marketsShow: 10,
  },

  // watch methods
  watch: {

    // Refetch coin data when id changes
    coinid() {
      this.initCoinData();
    },

    // Back to page 1 when searching market pairs
    marketsSearch() {
      this.marketsPage = 1;
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
     * Get list of markets
     */
    exchangesList() {
      let list = Object.values( this.exchangesData );

      // apply search
      if ( this.exchangesSearch.length > 1 ) {
        const regxp = new RegExp( '^('+ this.exchangesSearch +')', 'i' );
        list = list.filter( e => regxp.test( e.name ) );
      }
      // calculate pagination
      let total = list.length;
      let start = ( this.exchangesPage - 1 ) * this.exchangesShow;
      let end   = ( start + this.exchangesShow );
      this.exchangesPages = ( total > this.exchangesShow ) ? Math.ceil( total / this.exchangesShow ) : 1;

      // sort and slice the list
      list = this.$utils.sort( list, 'total_volume', 'desc' );
      list = list.slice( start, end );
      return list;
    },

    /**
     * Get list of markets
     */
    marketsList() {
      let list = Object.values( this.marketsData );

      // apply search
      if ( this.marketsSearch.length > 1 ) {
        const match = String( this.marketsSearch ).trim().replace( /[^\w]+/g, '|' );
        const regxp = new RegExp( '^.*\/('+ match +')$', 'i' );
        list = list.filter( m => regxp.test( m.pair ) );
      }
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
     * Get coin id from url hash
     */
    getHashId() {
      const hash = String( window.location.hash || '' ).replace( /[^\w\-]+/g, '' ).trim();
      this.coinid = hash ? hash : 'btc-bitcoin';
    },

    /**
     * Fetch and load coin data
     */
    initCoinData() {
      this.fetchCoin();
      this.fetchCharts();
      this.fetchEvents();
      this.fetchHistory();
      this.fetchMarkets();
    },

    /**
     * Update price of coins from alternative stream api if possible.
     */
    initCoincapStream() {
      if ( this.ws ) this.ws.close();
      this.ws = new WebSocket( 'wss://ws.coincap.io/prices?assets=' + this.coin.uniq );
      this.ws.addEventListener( 'error', e => console.error( 'WebSocket-Error', e ) );
      this.ws.addEventListener( 'close', e => setTimeout( this.initCoincapStream, 1000 * 5 ) );
      this.ws.addEventListener( 'message', e => {
        let data  = JSON.parse( e.data ) || {};
        let price = data[ this.coin.uniq ];
        this.coin.updateTicker( { price } );
      });
    },

    /**
     * Set the history list page
     */
    setPage( name, page ) {
      this[ name ] = parseInt( page );
    },

    /**
     * Show/hide market exchanges for a group
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
     * Create and setup chart instances
     */
    initApexCharts() {

      // build top price chart
      if ( this.$refs.chartPrice ) {
        let id         = 'chartPrice';
        let type       = 'area';
        let height     = 250;
        let toolbar    = { show: false };
        let chart      = { id, type, height, toolbar };
        let colors     = [ '#546E7A' ];
        let stroke     = { width: 3 };
        let fill       = { opacity: 1 };
        let dataLabels = { enabled: false };
        let markers    = { size: 0 };
        let xaxis      = { type: 'datetime' };
        let yaxis      = { tickAmount: 4 };
        let series     = [ { name: 'Price', data: [] } ];

        this.chartPrice = new ApexCharts( this.$refs.chartPrice, { chart, colors, stroke, fill, dataLabels, markers, xaxis, yaxis, series } );
        this.chartPrice.render();
      }

      // build bottom volume chart
      if ( this.$refs.chartVolume ) {
        let id         = 'chartVolume';
        let type       = 'area';
        let height     = 150;
        let brush      = { target: 'chartPrice', enabled: true };
        let selection  = { enabled: true, stroke: { width: 0 } };
        let chart      = { id, type, height, brush, selection };
        let colors     = [ '#546E7A' ];
        let fill       = { type: 'gradient', gradient: { opacityFrom: 0.91, opacityTo: 0.1 } };
        let xaxis      = { type: 'datetime', tooltip: { enabled: false } };
        let yaxis      = { tickAmount: 3 };
        let series     = [ { name: 'Volume', data: [] } ];

        this.chartVolume = new ApexCharts( this.$refs.chartVolume, { chart, colors, fill, xaxis, yaxis, series } );
        this.chartVolume.render();
      }
    },

    /**
     * Updates the apexcharts options
     */
    updateChart( selection ) {
      if ( !this.chartPrice || !this.chartVolume ) return;
      if ( !this.chartData.length ) return;
      let prices  = [];
      let volumes = [];

      // chart values come straight from api based on options above
      for ( let e of this.chartData ) {
        let x  = new Date( e.timestamp ).getTime();
        let py = Number( e.price );
        let vy = Number( e.volume_24h );
        prices.push( [ x, py ] );
        volumes.push( [ x, vy ] );
      }
      // update apex charts
      this.chartPrice.updateSeries( [ { data: prices } ] );
      this.chartVolume.updateSeries( [ { data: volumes } ] );
      this.chartVolume.updateOptions( { chart: { selection } } );
    },

    /**
     * Fetch chart data from api
     */
    fetchCharts( time, interval, limit ) {
      this.chartTime     = parseInt( time ) || 2592000;
      this.chartInterval = String( interval || '1h' );
      this.chartLimit    = parseInt( limit ) || 1000;
      this.chartBusy     = true;

      const now          = Date.now();
      const start        = Math.ceil( now / 1000 ) - this.chartTime;
      const selection    = { xaxis: { min: start * 1000, max: now } };
      const query        = this.$utils.queryStr( { start, interval: this.chartInterval, limit: this.chartLimit } );
      const request      = {
        method: 'GET',
        url: `https://api.coinpaprika.com/v1/tickers/${ this.coinid }/historical?${ query }`,
        responseType: 'json',
      }

      axios( request ).then( res => {
        // update chart data and charts
        this.chartBusy = false;
        this.chartData = res.data;
        this.updateChart( selection );

       }).catch( err => {
        this.chartBusy = false;
        console.warn( err );
      });
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

        this.fetchExchanges();
        this.initCoincapStream();

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

        let coin_volume = this.coin.volume_24h;
        let exchanges = {};

        for ( let e of res.data ) {
          // api data
          let { id, name, adjusted_volume_24h_share } = e;
          let total_volume = ( adjusted_volume_24h_share * coin_volume );

          // skip some exchanges
          if ( total_volume < this.marketsMinVol ) continue;

          // build exchange data
          exchanges[ id ] = { id, name, adjusted_volume_24h_share, total_volume };
        }
        // set data
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
      const quote = 'USD';
      const request = {
        method: 'GET',
        url: `https://api.coinpaprika.com/v1/coins/${ this.coinid }/markets?quotes=${ quote }`,
        responseType: 'json',
      }

      axios( request ).then( res => {
        if ( !Array.isArray( res.data ) ) return;

        let list = res.data;
        let count = list.length;
        let markets = {};
        let combined_volumes = 0;

        while ( count-- ) {
          // api data
          let { exchange_id, exchange_name, pair, market_url, adjusted_volume_24h_share } = list[ count ];
          let { price, volume_24h } = list[ count ].quotes[ quote ];
          let [ coin_symbol, quote_symbol ] = pair.split( '/' );

          // skip some markets
          if ( coin_symbol !== this.coin.symbol ) continue;
          if ( volume_24h < this.marketsMinVol ) continue;
          if ( this.marketsBlacklist.indexOf( exchange_id ) >= 0 ) continue;

          // init market group data
          if ( !markets[ pair ] ) {
            markets[ pair ] = {
              pair,
              coin_symbol,
              quote_symbol,
              adjusted_volume_24h_share,
              total_share: 0,
              total_volume: 0,
              total_exchanges: 0,
              average_price: 0,
              exchanges: {},
              active: false, // toggle for dropdown list
            };
          }

          // add up some values
          if ( !markets[ pair ].exchanges[ exchange_id ] ) {
            markets[ pair ].total_exchanges += 1;
            markets[ pair ].average_price += price;
          }

          // build group data
          combined_volumes += volume_24h;
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

        // calculate pair totals
        for ( let pair in markets ) {
          // calculare average price and share from totals
          let { average_price, total_exchanges, total_volume } = markets[ pair ];
          markets[ pair ].average_price = ( average_price / total_exchanges );
          markets[ pair ].total_share = ( total_volume / combined_volumes );
          // sort list of exchanges by volume
          let exchanges = Object.values( markets[ pair ].exchanges );
          exchanges = this.$utils.sort( exchanges, 'volume_24h', 'desc' );
          markets[ pair ].exchanges = exchanges;
        }

        // set data
        // console.log( markets );
        this.marketsData = markets;

       }).catch( err => {
        console.warn( err );
      });
    },

  },

  // app maunted
  mounted() {
    this.getHashId();
    this.initApexCharts();
    this.initCoinData();
  },

});

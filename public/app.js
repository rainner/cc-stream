/**
 * App
 */

Vue.filter( 'toFixed', ( num, decimals ) => {
  decimals = Number( decimals ) || 0;
  return Number( num ).toFixed( decimals );
});

Vue.filter( 'toMoney', ( num, fixed ) => {
  num   = parseFloat( num ) || 0;
  fixed = parseInt( fixed ) || 0;
  let o = { style: 'decimal', minimumFractionDigits: fixed, maximumFractionDigits: fixed };
  return new Intl.NumberFormat( 'en-US', o ).format( num );
});

new Vue({
  el: '#app',

  data: {
    ticker_base: 'USD',
    ticker_limit: 10,
    ticker_data: {},
    ticker_list: [],
    ticker_search: '',
    ticker_sort: '',
    ticker_order: '',
  },

  computed: {

    // get ticker list
    tickerList() {
      // let keys  = Object.keys( this.ticker_data );
      // let count = keys.length;
      // let list  = [];
      // while ( count-- ) list.push( this.ticker_data[ keys[ count ] ] );
    }
  },

  methods: {

    // start ticker stream
    initTicker() {
      const ticker = new CryptoCompare();
      ticker.fetchTopCoins( this.ticker_base, true );
      ticker.onData( data => { this.ticker_data = data } );
    }
  },

  mounted() {
    this.initTicker();
  }
});





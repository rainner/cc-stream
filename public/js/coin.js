/**
 * Wrapper class for a single coin
 */
class Coin {

  /**
   * Constructor
   */
  constructor() {
    // coin info
    this.id = '';
    this.uniq = '';
    this.symbol = '';
    this.quote = 'USD';
    this.name = '';
    this.pair = '';
    this.image = '';
    this.url = '';
    this.value = '';
    this.isfav = 0;
    // global values
    this.rank = 0;
    this.price = 0;
    this.ath_price = 0;
    this.converted_price = 0;
    this.price_prefix = '$';
    this.price_decimals = 3;
    this.volume_24h = 0;
    this.market_cap = 0;
    this.circulating_supply = 0;
    this.max_supply = 0;
    // change 1h
    this.percent_change_1h = 0;
    this.percent_change_1h_style = 'same';
    // change 24h
    this.percent_change_24h = 0;
    this.percent_change_24h_style = 'same';
    // change 7d
    this.percent_change_7d = 0;
    this.percent_change_7d_style = 'same';
    // change 30d
    this.percent_change_30d = 0;
    this.percent_change_30d_style = 'same';
    // change 1y
    this.percent_change_1y = 0;
    this.percent_change_1y_style = 'same';
    // graph data
    this.graph_24h_url = '';
    this.graph_7d_url = '';
    this.graph_30d_url = '';
    this.graph_1y_url = '';
    this.graph_last = Date.now();
    this.graph_data = [];
    // social data
    this.twitter_subs = 0;
    this.reddit_subs = 0;
    this.github_subs = 0;
    this.telegram_subs = 0;
  }

  /**
   * Set coin info data
   * @param {object}  data  Data object
   */
  setData( data ) {
    Object.assign( this, data );
    this.id = String( this.id ).trim();
    this.uniq = String( this.uniq ).trim();
    this.name = String( this.name ).trim();
    this.symbol = String( this.symbol ).replace( /[^a-zA-Z]+/g, '' ).toUpperCase();
    this.quote = String( this.quote ).replace( /[^a-zA-Z]+/g, '' ).toUpperCase();
    this.pair = this.symbol + this.quote;
    this.graph_24h_url = `https://graphs.coinpaprika.com/currency/chart/${ this.id }/24h/svg`;
    this.graph_7d_url = `https://graphs.coinpaprika.com/currency/chart/${ this.id }/7d/svg`;
    this.graph_30d_url = `https://graphs.coinpaprika.com/currency/chart/${ this.id }/30d/svg`;
    this.graph_1y_url = `https://graphs.coinpaprika.com/currency/chart/${ this.id }/1y/svg`;
    this.resolveImage();
  }

  /**
   * Set price related ticker data
   * @param {object}  data   Data object
   */
  updateTicker( data ) {
    Object.assign( this, data );
    this.rank = parseInt( this.rank ) || 0;
    this.price = parseFloat( this.price ) || 0;
    this.ath_price = parseFloat( this.ath_price ) || 0;
    this.volume_24h = parseFloat( this.volume_24h ) || 0;
    this.market_cap = parseFloat( this.market_cap ) || 0;
    this.circulating_supply = parseFloat( this.circulating_supply ) || 0;
    this.max_supply = parseFloat( this.max_supply ) || 0;
    this.percent_change_1h = parseFloat( this.percent_change_1h ) || 0;
    this.percent_change_1h_style = this.calculateStyle( this.percent_change_1h );
    this.percent_change_24h = parseFloat( this.percent_change_24h ) || 0;
    this.percent_change_24h_style = this.calculateStyle( this.percent_change_24h );
    this.percent_change_7d = parseFloat( this.percent_change_7d ) || 0;
    this.percent_change_7d_style = this.calculateStyle( this.percent_change_7d );
    this.percent_change_30d = parseFloat( this.percent_change_30d ) || 0;
    this.percent_change_30d_style = this.calculateStyle( this.percent_change_30d );
    this.percent_change_1y = parseFloat( this.percent_change_1y ) || 0;
    this.percent_change_1y_style = this.calculateStyle( this.percent_change_1y );
  }

  /**
   * Set social subs counts
   * @param {object}  data   Data object
   */
  updateSubs( data ) {
    Object.assign( this, data );
    this.twitter_subs = parseInt( this.twitter_subs ) || 0;
    this.reddit_subs = parseInt( this.reddit_subs ) || 0;
    this.github_subs = parseInt( this.github_subs ) || 0;
    this.telegram_subs = parseInt( this.telegram_subs ) || 0;
  }

  /**
   * Apply price conversion
   * @param {string}  symbol  Quote price symbol
   * @param {number}  usdval  Quote prive value in usd
   * @param {string}  prefix  Prefix symbol
   */
  convertPrice( symbol, usdval, prefix ) {
    symbol = String( symbol || '' );
    usdval = Number( usdval || 0 );
    prefix = String( prefix || '' );

    this.price_prefix = prefix;

    if ( symbol === 'USD' ) {
      this.converted_price = this.price;
      if ( this.price < 0.01 ) { this.price_decimals = 4; } else
      if ( this.price < 1 ) { this.price_decimals = 3; } else
      if ( this.price > 1 ) { this.price_decimals = 2; }
    }
    else {
      this.converted_price = Number( ( 100000000 / usdval ) * this.price ) / 100000000;
      this.price_decimals = 8;
    }
  }

  /**
   * Used to toggle favorite status for a coin
   * @param {boolean}  toggle  Boolean toggle
   */
  setFavorite( toggle ) {
    if ( typeof toggle !== 'boolean' ) return;
    this.isfav = ( toggle === true ) ? 1 : 0;
  }

  /**
   * Resolve image url for this coin
   * @param {string}  imgurl  URL of image to load
   */
  resolveImage() {
    if ( this.image || !this.symbol ) return;
    const symb = String( this.symbol ).toLowerCase();
    const url  = `https://www.coinrated.com/images/coins/${ symb }.svg`;
    const deft = `https://www.coinrated.com/images/coins/default.svg`;
    const temp = new Image();
    // image is set only if it loads
    temp.addEventListener( 'load', e => { this.image = temp.src; } );
    temp.addEventListener( 'error', e => { this.image = deft; } );
    temp.src = url;
  }

  /**
   * Update the 1hr graph with minute candle values
   */
  updateLiveGraph() {
    const wait    = 1; // time in secs
    const total   = 180; // time in secs
    const now     = Date.now();
    const elapsed = ( now - this.graph_last ) / 1000;

    if ( !this.graph_data.length ) this.fakeHistory();
    if ( elapsed < wait ) return;

    this.graph_data.push( this.converted_price );
    this.graph_last = now;

    if ( this.graph_data.length > total ) {
      this.graph_data.splice( 0, this.graph_data.length - total );
    }
  }

  /**
   * Flush current live graph data
   */
  flushLiveGraph() {
    this.graph_data = [];
  }

  /**
   * Come up with some fake history prices to fill in the initial line chart
   */
  fakeHistory() {
    let num = this.converted_price * 0.00001;
    let min = -Math.abs( num );
    let max = Math.abs( num );

    for ( let i = 0; i < 10; ++i ) {
      let rand = Math.random() * ( max - min ) + min;
      this.graph_data.push( this.converted_price + rand );
    }
  }

  /**
   * calculate color style for a change value
   * @param {float} change  Change 1h/24h/7d etc
   */
  calculateStyle( change ) {
    if ( change < 0 ) return 'loss';
    if ( change > 0 ) return 'gain';
    return 'same';
  }

}

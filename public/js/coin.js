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
    // global values
    this.price = 0;
    this.position = 0;
    this.rank = 0;
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
    // graph data
    this.graph_7d_url = '';
    this.graph_last = Date.now();
    this.graph_data = [];
  }

  /**
   * Set coin info data
   * @param {object}  data  Data object
   */
  setData( data ) {
    Object.assign( this, data );
    this.id = String( this.id ).trim();
    this.name = String( this.name ).trim();
    this.symbol = String( this.symbol ).replace( /[^a-zA-Z]+/g, '' ).toUpperCase();
    this.quote = String( this.quote ).replace( /[^a-zA-Z]+/g, '' ).toUpperCase();
    this.uniq = String( this.name ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();
    this.pair = this.symbol + this.quote;
    this.resolveImage();
  }

  /**
   * Set price related ticker data
   * @param {object}  data  Data object
   */
  updateTicker( data ) {
    Object.assign( this, data );
    this.rank = parseInt( this.rank ) || 0;
    this.price = parseFloat( this.price ) || 0;
    this.volume_24h = parseFloat( this.volume_24h ) || 0;
    this.market_cap = parseFloat( this.market_cap ) || 0;
    this.circulating_supply = parseFloat( this.circulating_supply ) || 0;
    this.max_supply = parseFloat( this.max_supply ) || 0;
    this.position = parseInt( this.position ) || 0;
    this.percent_change_1h = parseFloat( this.percent_change_1h ) || 0;
    this.percent_change_1h_style = this.calculateStyle( this.percent_change_1h );
    this.percent_change_24h = parseFloat( this.percent_change_24h ) || 0;
    this.percent_change_24h_style = this.calculateStyle( this.percent_change_24h );
    this.percent_change_7d = parseFloat( this.percent_change_7d ) || 0;
    this.percent_change_7d_style = this.calculateStyle( this.percent_change_7d );
    this.updateLiveGraph( this.price );
  }

  /**
   * Resolve image url for this coin
   * @param {string}  imgurl  URL of image to load
   */
  resolveImage() {
    if ( this.image || !this.symbol ) return;
    const temp = new Image();
    const symb = String( this.symbol ).toLowerCase();
    temp.addEventListener( 'load', e => { this.image = temp.src; } ); // image is set only if it loads
    temp.src = `https://raw.githubusercontent.com/rainner/binance-watch/master/public/images/icons/${ symb }_.png`;
  }

  /**
   * Update the 1hr graph with minute candle values
   * @param {float}  price  last price
   */
  updateLiveGraph( price ) {
    const wait = 1; // 1 sec
    const total = 900; // 15 mins
    const now = Date.now();
    const elapsed = ( now - this.graph_last ) / 1000;

    if ( !this.graph_data.length ) {
      this.fakeHistory();
    }
    if ( elapsed < wait ) {
      return;
    }
    this.graph_data.push( price );
    this.graph_last = now;

    if ( this.graph_data.length > total ) {
      this.graph_data.splice( this.graph_data.length - total );
    }
  }

  /**
   * Come up with some fake history prices to fill in the initial line chart
   */
  fakeHistory() {
    let num = this.price * 0.0001;
    let min = -Math.abs( num );
    let max = Math.abs( num );

    for ( let i = 0; i < 10; ++i ) {
      let rand = Math.random() * ( max - min ) + min;
      this.graph_data.push( this.price + rand );
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

/**
 * Wrapper class for a single coin
 */
class Coin {

  /**
   * Constructor
   */
  constructor() {
    this.id = '';
    this.uniq = '';
    this.name = '';
    this.symbol = '';
    this.quote = 'USD';
    this.pair = '';
    this.image = '';
    this.url = '';
    this.style = '';
    this.position = 0;
    this.rank = 0;
    this.price = 0;
    this.percent_change_24h = 0;
    this.volume_24h = 0;
    this.market_cap = 0;
    this.circulating_supply = 0;
    this.max_supply = 0;
    this.graph_1h = [];
    this.graph_7d = [];
  }

  /**
   * Set coin info data
   * @param {object}  data  Data object
   */
  setCoinData( data ) {
    Object.assign( this, data );
    this.name = String( this.name ).trim();
    this.uniq = String( this.name ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();
    this.symbol = String( this.symbol ).replace( /[^a-zA-Z]+/g, '' ).toUpperCase();
    this.quote = String( this.quote ).replace( /[^a-zA-Z]+/g, '' ).toUpperCase();
    this.pair = String( this.symbol + this.quote ).toUpperCase();
  }

  /**
   * Set price related ticker data
   * @param {object}  data  Data object
   */
  setTickerData( data ) {
    Object.assign( this, data );
    this.price = parseFloat( this.price ) || 0;
    this.percent_change_24h = parseFloat( this.percent_change_24h ) || 0;
    this.volume_24h = parseFloat( this.volume_24h ) || 0;
    this.market_cap = parseFloat( this.market_cap ) || 0;
    this.circulating_supply = parseFloat( this.circulating_supply ) || 0;
    this.max_supply = parseFloat( this.max_supply ) || 0;
    this.position = parseInt( this.position ) || 0;
    this.rank = parseInt( this.rank ) || 0;

    if ( this.percent_change_24h < 0 ) { this.style = 'loss'; }
    else if ( this.percent_change_24h > 0 ) { this.style = 'gain'; }
    else { this.style = 'same'; }
  }

  /**
   * Check if an id matches the id of this coin
   * @param {string}  uniq  Coin name or id string
   */
  isCoin( uniq ) {
    uniq = String( uniq || '' ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();
    return ( this.uniq === uniq );
  }

  /**
   * Update the 1hr graph with minute candle values
   * @param {array|float}  data  Prices array, or latest price
   */
  updateGraph1h( data ) {
    if ( Array.isArray( data ) ) {
      this.graph_1h = data.map( price => parseFloat( price ) || 0 );
    } else {
      this.graph_1h.push( parseFloat( data ) || 0 );
    }
    if ( this.graph_1h.length > 60 ) {
      this.graph_1h.splice( this.graph_1h.length - 60 );
    }
  }

  /**
   * Set data for the 7d graph
   * @param {array}  data  List of prices for 7 days
   */
  updateGraph7d( data ) {
    if ( Array.isArray( data ) ) {
      this.graph_7d = data.map( price => parseFloat( price ) || 0 );
    }
  }

}

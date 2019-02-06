/**
 * Common app utils
 */
Vue.prototype.$utils = {

  // used to convert coin name into unique identifier.
  uniq( name ) {
    return String( name ).replace( /[^a-zA-Z0-9]+/g, '-' ).toLowerCase();
  },

  // get search results off a list for an obj key
  search( list, key, search ) {
    search = String( search || '' ).replace( /[^\w\/\ ]+/g, '' ).trim();
    const regxp = new RegExp( search, 'i' );
    return list.filter( item => regxp.test( item[ key ] ) );
  },

  // helper method for sorting a list.
  sort( list, key, order, ignore ) {
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

  // get data about current date and time
  parseTime( time ) {
    let _p      = ( n ) => ( n < 10 ) ? '0'+ n : ''+ n;
    let date    = ( time instanceof Date ) ? time : new Date( time || Date.now() );
    let month   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][ date.getMonth() ];
    let year    = date.getFullYear();
    let day     = _p( date.getDate() );
    let minute  = _p( date.getMinutes() );
    let second  = _p( date.getSeconds() );
    let fullh   = date.getHours();
    let ampm    = ( fullh > 12 ) ? 'PM' : 'AM';
    let hour    = ( fullh > 12 ) ? ( fullh - 12 ) : fullh;
    hour        = _p( hour === 0 ? 12 : hour );
    return { month, day, year, hour, minute, second, ampm };
  },

  // convert url string into an anchor element (parser)
  parseUrl( url, prop ) {
    let link = document.createElement( 'a' );
    link.href = url;
    let data = link[ prop ] || '';
    link = null;
    return data;
  },

  // build query string from an object
  queryStr( obj ) {
    if ( typeof obj !== 'object' ) return '';
    let items = [];
    for ( let k in obj ) items.push( k +'='+ obj[ k ] );
    return items.join( '&' );
  },

}

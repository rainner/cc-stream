/**
 * Line chart component
 */
Vue.component( 'linechart', {

  template: `
  <svg :viewBox="viewBox" xmlns="http://www.w3.org/2000/svg">
    <polyline class="color" fill="none" stroke-width="1.5" stroke-linecap="round" :points="chartPoints" />
  </svg>`,

  props: {
    width: { type: Number, default: 400, required: true },
    height: { type: Number, default: 40, required: true },
    values: { type: Array, default: [], required: true },
  },

  computed: {

    viewBox() {
      return '0 0 '+ this.width +' '+ this.height;
    },

    chartPoints() {
      let data = this.getPoints();
      let list = data.map( d => ( d.x - 10 ) +','+ d.y );
      return list.join( ' ' );
    },
  },

  methods: {

    getPoints() {
      this.width  = parseFloat( this.width ) || 0;
      this.height = parseFloat( this.height ) || 0;
      let min     = this.values.reduce( ( min, val ) => val < min ? val : min, this.values[ 0 ] );
      let max     = this.values.reduce( ( max, val ) => val > max ? val : max, this.values[ 0 ] );
      let len     = this.values.length;
      let half    = this.height / 2;
      let range   = ( max > min ) ? ( max - min ) : this.height;
      let gap     = ( len > 1 ) ? ( this.width / ( len - 1 ) ) : 1;
      let points  = [];

      for ( let i = 0; i < len; ++i ) {
        let d = this.values[ i ];
        let val = 2 * ( ( d - min ) / range - 0.5 );
        let x = i * gap;
        let y = -val * half * 0.8 + half;
        points.push( { x, y } );
      }
      return points;
    }
  },

});

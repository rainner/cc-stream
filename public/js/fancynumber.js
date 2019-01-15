/**
 * Animated number component
 */
Vue.component( 'fancynumber', {

  template: `<span>{{ animatedNumber }}</span>`,

  props: {
    number: { type: Number, default: 0 }, // original number
    type: { type: String, default: '' }, // type: money, percent
    decimals: { type: Number, default: 0 }, // decimal places
    prefix: { type: String, default: '' }, // prefix symbol
  },

  data() {
    return {
      tweenedNumber: 0,
    }
  },

  watch: {
    number( newValue ) {
      TweenLite.to( this.$data, 0.5, { tweenedNumber: newValue } );
    }
  },

  computed: {
    animatedNumber() {
      let o = { style: 'decimal', minimumFractionDigits: this.decimals, maximumFractionDigits: this.decimals };
      let n = new Intl.NumberFormat( 'en-US', o ).format( this.tweenedNumber || this.number );

      if ( this.type === 'money' ) {
        let a = [ '', 'K', 'M', 'B', 'T', '', '', '' ];
        let p = n.split( ',' );
        return this.prefix + ( p.length ? n +' '+ a[ p.length - 1 ] : n );
      }
      if ( this.type === 'percent' ) {
        return this.prefix + n + '%';
      }
      return this.prefix + n;
    },
  },

});

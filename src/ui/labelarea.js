
phina.namespace(function() {

  var dummyCanvas = document.createElement('canvas');
  var dummyContext = dummyCanvas.getContext('2d');
  var textWidthCache = {};

  var LabelArea = phina.define('phina.ui.LabelArea', {
    superClass: 'phina.display.Label',

    _lineUpdate: true,

    init: function(options) {
      options = {}.$safe(options, LabelArea.defaults);
      this.superInit(options);

      this.verticalAlign = options.verticalAlign;
      this.scroll = options.scroll || phina.geom.Vector2();
      this.scrollX = options.scrollX;
      this.scrollY = options.scrollY;
    },

    calcCanvasWidth: function() {
      return this.width + this.padding * 2;
    },

    calcCanvasHeight: function() {
      return this.height + this.padding * 2;
    },
    getOffsetY: function() {
      if (typeof this.verticalAlign === 'number') {
        return this.verticalAlign;
      }
      return LabelArea.verticalAlignToOffsetMap[this.verticalAlign] || 0;
    },

    getOffsetX: function() {
      return LabelArea.alignToOffsetMap[this.align] || 0;
    },

    getTextWidthCache: function() {
      var cache = textWidthCache[this.font];
      return cache || (textWidthCache[this.font] = {});
    },

    getLines: function() {
      if (this._lineUpdate === false) {
        return this._lines;
      }

      this._lineUpdate = false;
      var lines = this._lines = (this.text + '').split('\n');

      if (this.width < 1) return lines;

      var rowWidth = this.width;
      dummyContext.font = this.font;

      //どのへんで改行されるか目星つけとく
      var index = rowWidth / dummyContext.measureText('あ').width | 0;

      var cache = this.getTextWidthCache();
      for (var i = lines.length; i--;) {
        var text = lines[i],
            len,
            j = 0,
            width,
            breakFlag = false,
            char;

        if (text === '') { continue;}

        while (true) {
          //if (rowWidth > (cache[text] || (cache[text] = dummyContext.measureText(text).width))) break;

          len = text.length;
          if (index >= len) index = len - 1;

          width = cache[char = text.substring(0, index)] || (cache[char] = dummyContext.measureText(char).width);

          if (rowWidth < width) {
            while (rowWidth < (width -= cache[char = text[--index]] || (cache[char] = dummyContext.measureText(char).width)));
          } else {
            while (rowWidth >= (width += cache[char = text[index++]] || (cache[char] = dummyContext.measureText(char).width))) {
              if (index >= len) {
                breakFlag = true;
                break;
              }
            }
            --index;
          }
          if (breakFlag) {
            break;
          }
          //index が 0 のときは無限ループになるので、1にしとく
          if (index === 0) index = 1;

          lines.splice(i + j++, 1, text.substring(0, index), text = text.substring(index, len));
        }

      }

      return lines;

    },

    render: function(canvas) {
      var context = canvas.context;

      var text = this.text + '';
      var lines = this.getLines();
      var length = lines.length;
      var width = this.width;
      var height = this.height;

      context.font = this.font;
      context.textAlign = this.align;
      context.textBaseline = this.baseline;
      var fontSize = this.fontSize;
      var lineSize = fontSize * this.lineHeight;
      var offsetX = this.getOffsetX() * width;
      var offsetY = this.getOffsetY();
      if (offsetY === 0) {
        offsetY = -Math.floor(length / 2) * lineSize;
        offsetY += ((length + 1) % 2) * (lineSize / 2);
      }
      else if (offsetY < 0) {
        offsetY *= height;
      }
      else {
        offsetY = offsetY * height - length * lineSize + lineSize;
      }

      offsetY += this.scrollY;
      offsetX += this.scrollX;
      var start = (offsetY + height / 2) / -lineSize | 0;
      if (start < 0) { start = 0; }

      var end = (height / 2 - offsetY + lineSize * 2) / lineSize | 0;
      lines = lines.filter(function(line, i) {
        return start <= i && end > i;
      });

      if (this.stroke) {
        context.strokeStyle = this.stroke;
        context.lineWidth = this.strokeWidth;
        context.lineJoin = "round";
        context.shadowBlur = 0;
        lines.forEach(function(line, i) {
          context.strokeText(line, offsetX, (start + i) * lineSize + offsetY);
        }, this);
      }

      if (this.shadow) {
        context.shadowColor = this.shadow;
        context.shadowBlur = this.shadowBlur;
      }

      if (this.fill) {
        context.fillStyle = this.fill;
        lines.forEach(function(line, i) {
          context.fillText(line, offsetX, (start + i) * lineSize + offsetY);
        }, this);
      }

    },
    _accessor: {
      text: {
        get: function() {
          return this._text;
        },
        set: function(v) {
          this._text = v;
        }
      },

      scrollX: {
        get: function() {
          return this.scroll.x;
        },
        set: function(v) {
          this.scroll.x = v;
        },
      },

      scrollY: {
        get: function() {
          return this.scroll.y;
        },
        set: function(v) {
          this.scroll.y = v;
        },
      },
    },
    _static: {
      defaults: {
        verticalAlign: 'top',
        align: 'left',
        baseline: 'top',
        width: 320,
        height: 320,
        scrollX: 0,
        scrollY: 0,
      },
      alignToOffsetMap: {
        start: -0.5,
        left: -0.5,
        center: 0,
        end: 0.5,
        right: 0.5,
      },

      verticalAlignToOffsetMap: {
        top: -0.5,
        center: 0,
        middle: 0,
        bottom: 0.5,
      },
    },
    _defined: function() {
      var watch = phina.display.Shape.watchRenderProperty;
      [
        'verticalAlign',
        'text',
        'scroll',
        'scrollX',
        'scrollY'
      ]
      .forEach(function(p) {
        watch.call(this, p);
      }, this);

      var func = function(newVal, oldVal) {
        this._lineUpdate = newVal !== oldVal;
      };

      [
        'text',
        'width',
        'fontSize',
        'fontWeight',
        'fontFamily'
      ].forEach(function(key) {
        this.$watch(key, func);
      }, this.prototype);

      // phina.display.Shape.watchRenderProperties.call(this ,[
      //   'verticalAlign',
      //   'text',
      //   'scroll',
      //   'scroll.x',
      //   'scroll.y'
      // ]);
    },

    enableScroll: function() {
      //   this.setInteractive(true);
      //   var physical = phina.accessory.Physical();
      //   physical.attachTo(this);
      //   physical.friction = 0.8;
      //   var lastForce = 0;
      //   var lastMove = 0;
      //   this.on('pointstart', function(e){
      //     lastForce = physical.velocity.y;
      //     lastMove = 0;
      //     physical.force(0, 0);
      //   });
      //   this.on('pointmove', function(e){
      //     var p = e.pointer.deltaPosition;
      //     lastMove = p.y;
      //     this.scrollY += lastMove;
      //   });

      //   this.on('pointend', function(e){
      //     physical.force(0, lastForce + lastMove);
      //   });

      return this;
    },

  });

});
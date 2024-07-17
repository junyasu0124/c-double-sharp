import { Category, Kind, SyntaxError, UnhandledError, contextKeywords, keywords, kindOfKeywordOrModifier, operators } from "./convert";
import { debounce, EventEmitter, delay, repaint, findLast, findLastIndex } from "./functions";

export { Token };


const DEFAULT_KIND = { name: 'text', colorId: 'black' };
const SELECTION_COLOR_ID = 'selection';

document.addEventListener('DOMContentLoaded', () => {
  Colors.colors.push({ id: 'black', color: '#000000' });
  BackgroundColors.colors.push({ id: 'red', color: '#ff000066' });
  BackgroundColors.colors.push({ id: 'green', color: '#00ff0066' });
  Lines.appendLine();
  Caret.set(0, 0);

  Lines.lines[0].insertText('C#', 0);

  Lines.appendLine('Hello, World!');
  Lines.appendLine('こんにちは、世界！');

  Decorations.create(0, 0, 2, 'green', undefined, 1);
  Decorations.create(1, 1, 8, 'red', undefined, 2);

  let isLatestCopyNotSelected: false | string = false;
  const splitByLineBreak = /\r\n|\r|\n/;
  let errored = false;
  document.onkeydown = (e) => {
    if (e.isComposing || e.keyCode === 243 || e.keyCode === 244) {
      return;
    }

    if (e.key === 'F5' || e.key === 'F12')
      return;

    e.preventDefault();

    let s = 0;
    for (let i = 0; i < Lines.lines.length; i++) {
      for (let j = 0; j < Lines.lines[i].tokens.length; j++) {
        if (s !== Lines.lines[i].tokens[j].start) {
          if (!errored) {
            alert('See console.');
            errored = true;
          }
          console.log(s === Lines.lines[i].tokens[j].start);
          console.log(Lines.lines);
        }
        s = Lines.lines[i].tokens[j].end;
      }
    }

    if (!e.metaKey) {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          repeatAction(() => {
            if (e.altKey) {
            } else {
              const left = Caret.rangeStart === null ? Caret.left : Caret.rangeStart.left;
              const top = Caret.rangeStart === null ? Caret.top : Caret.rangeStart.top;
              if (Caret.rangeStart === null || e.shiftKey) {
                if (e.key === 'ArrowLeft')
                  Caret.moveLeft();
                else
                  Caret.moveRight();
              } else {
                if (e.key === 'ArrowLeft') {
                  if (Caret.top >= Caret.rangeStart.top && (Caret.top !== Caret.rangeStart.top || Caret.left >= Caret.rangeStart.left))
                    Caret.set(Caret.rangeStart.left, Caret.rangeStart.top);
                } else {
                  if (Caret.top <= Caret.rangeStart.top && (Caret.top !== Caret.rangeStart.top || Caret.left <= Caret.rangeStart.left))
                    Caret.set(Caret.rangeStart.left, Caret.rangeStart.top);
                }
              }
              if (e.shiftKey)
                Caret.changeSelection(left, top);
              else
                Caret.clearSelection();
            }
          });
          return;
        case 'ArrowUp':
        case 'ArrowDown':
          repeatAction(() => {
            if (e.altKey) {
              if (Caret.rangeStart !== null) {
                const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
                const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;
                if ((e.key === 'ArrowUp' && start.top > 0) || (e.key === 'ArrowDown' && end.top < Lines.lines.length - 1)) {
                  Lines.swapLine(start.top, end.top - start.top + 1, e.key === 'ArrowUp');
                  Caret.set(Caret.left, Caret.top + (e.key === 'ArrowUp' ? -1 : 1));
                  Caret.changeSelection(Caret.rangeStart.left, Caret.rangeStart.top + (e.key === 'ArrowUp' ? -1 : 1));
                }
                return;
              }
              if ((e.key === 'ArrowUp' && Caret.top > 0) || (e.key === 'ArrowDown' && Caret.top < Lines.lines.length - 1)) {
                Lines.swapLine(Caret.top, 1, e.key === 'ArrowUp');
                Caret.set(Caret.left, Caret.top + (e.key === 'ArrowUp' ? -1 : 1));
              }
            } else {
              const left = Caret.rangeStart === null ? Caret.left : Caret.rangeStart.left;
              const top = Caret.rangeStart === null ? Caret.top : Caret.rangeStart.top;
              if (e.key === 'ArrowUp')
                Caret.moveUp();
              else
                Caret.moveDown();
              if (e.shiftKey)
                Caret.changeSelection(left, top);
              else
                Caret.clearSelection();
            }
          });
          return;
        case 'Enter':
          if (e.ctrlKey) {
            if (e.shiftKey) {
              const start = Caret.rangeStart === null ? { left: Caret.left, top: Caret.top } : (Caret.rangeStart.top > Caret.top ? { left: Caret.left, top: Caret.top } : (Caret.rangeStart.top === Caret.top ? (Caret.rangeStart.left > Caret.left ? { left: Caret.left, top: Caret.top } : { left: Caret.rangeStart.left, top: Caret.rangeStart.top }) : { left: Caret.rangeStart.left, top: Caret.rangeStart.top }));
              Caret.clearSelection();
              if (start.top === 0) {
                Lines.insertLine(0);
                Caret.set(0, 0);
              } else {
                Lines.insertLine(start.top);
                Caret.set(0, start.top);
              }
            } else {
              const end = Caret.rangeStart === null ? { left: Caret.left, top: Caret.top } : (Caret.rangeStart.top < Caret.top ? { left: Caret.left, top: Caret.top } : (Caret.rangeStart.top === Caret.top ? (Caret.rangeStart.left < Caret.left ? { left: Caret.left, top: Caret.top } : { left: Caret.rangeStart.left, top: Caret.rangeStart.top }) : { left: Caret.rangeStart.left, top: Caret.rangeStart.top }));
              Caret.clearSelection();
              Lines.insertLine(end.top + 1);
              Caret.set(0, end.top + 1);
            }
          } else {
            if (Caret.rangeStart !== null) {
              const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
              const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;
              Caret.clearSelection();
              Caret.set(start.left, start.top);
              Lines.deleteRange(start, end);
            }
            Lines.lines[Caret.top].startNewLine(Caret.left);
          }
          return;
        case 'Backspace':
          if (Caret.rangeStart !== null) {
            const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
            const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;
            Caret.clearSelection();
            Caret.set(start.left, start.top);
            Lines.deleteRange(start, end);
          } else {
            const topTemp = Caret.top;
            const leftTemp = Caret.left;
            Caret.moveLeft();
            Lines.lines[topTemp].deleteText(leftTemp - 1, 1);
          }
          return;
        case 'Delete':
          if (!e.shiftKey) {
            if (Caret.rangeStart !== null) {
              const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
              const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;
              Caret.clearSelection();
              Caret.set(start.left, start.top);
              Lines.deleteRange(start, end);
            } else {
              Lines.lines[Caret.top].deleteText(Caret.left, 1);
            }
          }
          return;
      }
    }
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
      if (Caret.rangeStart !== null) {
        const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
        const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;
        Caret.clearSelection();
        Lines.deleteRange(start, end);
        Lines.lines[start.top].insertText(e.key, start.left);
        Caret.set(start.left + 1, start.top);
      } else {
        Lines.lines[Caret.top].insertText(e.key, Caret.left);
        Caret.moveRight();
      }
    } else if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      if (e.key === 'v') {
        navigator.clipboard.readText().then(async text => {
          if (text === '')
            return;

          if (text === isLatestCopyNotSelected) {
            const lengthTemp = Lines.lines[Caret.top].length;
            Lines.lines[Caret.top].insertText(text.slice(0, -2), 0);
            Lines.lines[Caret.top].startNewLine(text.length - 2);
            Caret.set(lengthTemp, Caret.top);
            return;
          }

          let dialog: Dialog | null = null;
          if (text.length > 1000) {
            dialog = new Dialog('貼り付け中', 'テキストをクリップボードから貼り付け中です。しばらくお待ちください。', []);
            await dialog.show();
          }

          if (Caret.rangeStart !== null) {
            const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
            const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;
            Caret.clearSelection();
            Caret.set(start.left, start.top);
            Lines.deleteRange(start, end);
          }

          const split = text.split(splitByLineBreak);
          if (split.length === 1) {
            Lines.lines[Caret.top].insertText(text, Caret.left);
            Caret.set(Caret.left + text.length, Caret.top);
          } else {
            const textTemp = Lines.lines[Caret.top].text.slice(Caret.left);

            Lines.lines[Caret.top].deleteText(Caret.left, textTemp.length);
            Lines.lines[Caret.top].insertText(split[0], Caret.left);

            let top = Caret.top + 1;

            for (let i = 1; i < split.length - 1; i++) {
              Lines.insertLine(top, split[i]);
              top++;
            }

            Lines.insertLine(top, split[split.length - 1] + textTemp);

            for (let i = top + 1; i < Lines.lines.length; i++) {
              Lines.lines[i].leftOfTokensOffset += split.reduce((a, b) => a + b.length, 0) - split[0].length + textTemp.length;
            }

            Caret.set(split[split.length - 1].length, top);
          }

          dialog?.hide();
        });
      } else if (e.key === 'c' || e.key === 'x') {
        let text: string;
        if (Caret.rangeStart !== null) {
          const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
          const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;

          if (start.top === end.top) {
            text = Lines.lines[start.top].text.slice(start.left, end.left);
          } else {
            text = Lines.lines[start.top].text.slice(start.left) + (start.top === end.top - 1 ? '\r\n' : '\r\n' + Lines.lines.slice(start.top + 1, end.top).map(line => line.text).join('\r\n') + '\r\n') + Lines.lines[end.top].text.slice(0, end.left);
          }
          isLatestCopyNotSelected = false;

          if (e.key === 'x') {
            Caret.clearSelection();
            Caret.set(start.left, start.top);
            Lines.deleteRange(start, end);
          }
        } else {
          text = Lines.lines[Caret.top].text + '\r\n';
          isLatestCopyNotSelected = text;
        }
        navigator.clipboard.writeText(text);
      } else if (e.key === 'a') {
        Caret.set(0, 0);
        Caret.changeSelection(Lines.lines[Lines.lines.length - 1].length, Lines.lines.length - 1);
        Caret.rangeStart = { left: 0, top: 0 };
        Caret.set(Lines.lines[Lines.lines.length - 1].length, Lines.lines.length - 1);
      }
    }
  };

  document.onkeyup = (e) => {
    if (e.isComposing || e.keyCode === 229) {
      return;
    }

    e.preventDefault();

    stopRepeatAction();
  };

  let isMouseDown = false;
  document.onmousedown = (e) => {
    const position = calculateMousePosition(e);
    if (position === null)
      return;
    if (e.shiftKey) {
      const left = Caret.rangeStart === null ? Caret.left : Caret.rangeStart.left;
      const top = Caret.rangeStart === null ? Caret.top : Caret.rangeStart.top;
      Caret.set(position.left, position.top);
      Caret.changeSelection(left, top);
    } else {
      Caret.clearSelection();
      Caret.set(position.left, position.top);
      isMouseDown = true;
    }
  };
  document.onmousemove = (e) => {
    if (isMouseDown === false) return;

    debounce((e: MouseEvent) => {
      const position = calculateMousePosition(e);
      if (position === null)
        return;
      if (Caret.left !== position.left || Caret.top !== position.top) {
        const left = Caret.rangeStart === null ? Caret.left : Caret.rangeStart.left;
        const top = Caret.rangeStart === null ? Caret.top : Caret.rangeStart.top;
        Caret.set(position.left, position.top);
        Caret.changeSelection(left, top);
      }
    }, 50, true)(e);
  };
  document.onmouseup = () => {
    isMouseDown = false;
  };
});

class Caret {
  private static _left: number = 0;
  // テキストが変更されたら、_leftTemp、_topOfLeftTempをnullにする
  private static _leftTemp: number | null = 0;
  private static _topOfLeftTemp: number | null = null;
  private static _top: number = 0;

  public static rangeStart: { left: number, top: number } | null = null;
  public static rangeEndsDecoration: { start: Token | null, end: Token | null } | null = null;

  public static get left() {
    return Caret._left;
  }
  public static get top() {
    return Caret._top;
  }
  public static get offset() {
    if (Lines.lines.length === 1)
      return Caret._left;
    return Lines.lines.slice(0, Caret._top).reduce((acc, line) => acc + line.length + 1, 0) + Caret._left;
  }
  public static get isRangeSelected() {
    return Caret.rangeStart !== null;
  }

  public static set left(left: number) {
    if (left <= 0) {
      Caret._left = 0;
    } else {
      if (Lines.lines[Caret._top].length >= left) {
        Caret._left = left;
      } else {
        Caret._left = Lines.lines[Caret._top].length;
      }
    }
    Caret._leftTemp = Caret._left;
    Caret._topOfLeftTemp = Caret._top;
  }
  public static set top(top: number) {
    if (top <= 0) {
      Caret._top = 0;
    } else if (top >= Lines.lines.length) {
      Caret._top = Lines.lines.length - 1;
    } else {
      Caret._top = top;
    }

    if ((Caret._leftTemp === null)) {
      Caret._left = Lines.lines[Caret._top].length;
    } else {
      if (Caret._topOfLeftTemp === null || Caret._topOfLeftTemp === Caret._top) {
        Caret._left = Caret._leftTemp;
      } else {
        const width = measureTextWidth(Lines.lines[Caret._topOfLeftTemp].text.slice(0, Caret._leftTemp));
        const text = Lines.lines[Caret._top].text;
        for (let i = 0; i <= Lines.lines[Caret._top].length; i++) {
          const lastCharWidth = measureTextWidth(text.slice(i - 1, i));
          const nextWidth = measureTextWidth(text.slice(0, i));
          if (nextWidth >= width - lastCharWidth / 2) {
            Caret._left = i;
            return;
          }
        }
        Caret._left = Lines.lines[Caret._top].length;
      }
    }
  }
  public static set(left: number, top: number) {
    Caret._top = top;
    Caret.left = left;
    Caret._leftTemp = left;
    Caret._topOfLeftTemp = top;
    Caret.top = top;

    this.move(Caret._left, Caret._top);
  }

  public static moveWithOffset(offset: number) {
    if (offset < 0) {
      Caret.left = 0;
      Caret.top = 0;
    } else {
      while (true) {
        if (Lines.lines[Caret.top].length - offset >= 0) {
          Caret.left = offset;
          break;
        } else {
          offset -= Lines.lines[Caret.top].length + 1;
          Caret.top++;
        }
      }

      this.move(Caret._left, Caret._top);
    }
    Caret._leftTemp = Caret.left;
    Caret._topOfLeftTemp = Caret.top;
  }
  public static moveLeft() {
    if (Caret.left === 0) {
      if (Caret.top === 0)
        return;
      Caret.top--;
      Caret.left = Lines.lines[Caret.top].length;
    } else if (Caret.left > 0) {
      Caret.left--;
    } else if (Caret.top > 0) {
      Caret.top--;
      Caret.left = Lines.lines[Caret.top].length;
    }
    Caret._leftTemp = Caret.left;
    Caret._topOfLeftTemp = Caret.top;

    this.move(Caret._left, Caret._top);
  }
  public static moveRight() {
    if (Caret.left < Lines.lines[Caret.top].length) {
      Caret.left++;
    } else if (Caret.top < Lines.lines.length - 1) {
      Caret.top++;
      Caret.left = 0;
    }
    Caret._leftTemp = Caret.left;
    Caret._topOfLeftTemp = Caret.top;

    this.move(Caret._left, Caret._top);
  }
  public static moveUp() {
    if (Caret.top > 0) {
      Caret.top--;
      if (Caret._left > Lines.lines[Caret.top].length) {
        Caret._leftTemp = Caret.left;
        Caret._topOfLeftTemp = Caret.top;
      }
    }

    this.move(Caret._left, Caret._top);
  }
  public static moveDown() {
    if (Caret.top < Lines.lines.length - 1) {
      Caret.top++;
      if (Caret._left > Lines.lines[Caret.top].length) {
        Caret._leftTemp = Caret.left;
        Caret._topOfLeftTemp = Caret.top;
      }
    }

    this.move(Caret._left, Caret._top);
  }

  private static caretBlinkInterval: number | null = null;
  private static caretMovedTime = 0;
  private static move(left: number, top: number) {
    const caret = document.getElementById('caret');
    if (caret !== null) {
      document.querySelector('.lineNumber.selected')?.classList.remove('selected');

      const lineNumberElement = document.getElementById('line' + Lines.lines[this.top].lineId.toString())!.children[0];
      lineNumberElement.classList.add('selected');

      const styleOfLineNumberElement = getComputedStyle(lineNumberElement);
      const marginLeft = parseFloat(styleOfLineNumberElement.width.replace('px', '')) + parseFloat(styleOfLineNumberElement.paddingRight.replace('px', ''));
      caret.className = '';
      const caretLeft = measureTextWidth(Lines.lines[top].text.slice(0, left));
      caret.style.left = `${caretLeft - 1 + marginLeft}px`;
      caret.style.top = `${document.getElementById('line' + Lines.lines[top].lineId.toString())?.offsetTop}px`;
      if (this.caretBlinkInterval !== null) {
        clearInterval(this.caretBlinkInterval);
      }

      const now = Date.now();
      this.caretMovedTime = now;
      setTimeout(() => {
        if (this.caretMovedTime === now) {
          window.requestAnimationFrame(() => {
            caret.className = 'blink';
          });
        }
      }, 500);
    }
  }

  public static changeSelection(left: number, top: number) {
    this.rangeStart = { left, top };
    const isCaretUpper = this.top < this.rangeStart.top || (this.top === this.rangeStart.top && this.left < this.rangeStart.left);
    const start = isCaretUpper ? { left: this.left, top: this.top } : { left: this.rangeStart.left, top: this.rangeStart.top };
    const end = isCaretUpper ? { left: this.rangeStart.left, top: this.rangeStart.top } : { left: this.left, top: this.top };

    this.clearSelection(false);

    let startLeftAtStartEnd = 0;
    for (let i = start.top; i >= 0; i--) {
      if (Lines.lines[i].tokens.length > 0) {
        startLeftAtStartEnd = Lines.lines[i].tokens[0].start + start.left;
        break;
      }
    }
    let endLeftAtStartEnd = 0;
    for (let i = end.top; i >= 0; i--) {
      if (Lines.lines[i].tokens.length > 0) {
        endLeftAtStartEnd = Lines.lines[i].tokens[0].start + end.left;
        break;
      }
    }

    if (start.top === end.top) {
      Lines.lines[start.top].tokens.forEach(token => {
        if (token.start >= startLeftAtStartEnd && token.end <= endLeftAtStartEnd) {
          token.element!.classList.add('selection');
        }
      });
    } else {
      const startTokens = Lines.lines[start.top].tokens.filter(token => token.start >= startLeftAtStartEnd);
      startTokens.forEach(token => {
        token.element!.classList.add('selection');
      });
      if (startTokens.length > 0)
        startTokens[startTokens.length - 1].element!.classList.add('extensionOfLineBreak');
      else
        createExtensionOfLineBreakForEmptyLine(start.top);

      for (let i = start.top + 1; i <= end.top - 1; i++) {
        for (let j = 0; j < Lines.lines[i].tokens.length; j++) {
          Lines.lines[i].tokens[j].element!.classList.add('selection');
        }
        if (Lines.lines[i].tokens.length > 0)
          Lines.lines[i].tokens[Lines.lines[i].tokens.length - 1].element!.classList.add('extensionOfLineBreak');
        else
          createExtensionOfLineBreakForEmptyLine(i);
      }

      Lines.lines[end.top].tokens.forEach(token => {
        if (token.end <= endLeftAtStartEnd)
          token.element!.classList.add('selection');
      });
    }
    const startIsHead = isHeadOfToken(start.left, start.top, startLeftAtStartEnd);
    const endIsHead = isHeadOfToken(end.left, end.top, endLeftAtStartEnd);
    if (startIsHead === false) {
      const startDecorationToken = createStartDecoration();
      if (endIsHead === false)
        createEndDecoration(startDecorationToken);
    } else if (endIsHead === false) {
      createEndDecoration();
    }

    function createStartDecoration() {
      const startToken = Lines.lines[start.top].tokens.find(token => token.end >= startLeftAtStartEnd)!;
      Decoration.create(startToken, startLeftAtStartEnd - startToken.start, startToken.text.length - (startLeftAtStartEnd - startToken.start), SELECTION_COLOR_ID, 'selection');
      Caret.rangeEndsDecoration = { start: startToken, end: null };
      return startToken;
    }
    function createEndDecoration(startDecorationToken: Token | null = null) {
      const endToken = findLast(Lines.lines[end.top].tokens, token => token.start <= endLeftAtStartEnd)!;

      if (endToken === startDecorationToken) {
        const decoration = startDecorationToken.decorations.find(decoration => decoration.type === 'selection')!;
        decoration.length = endLeftAtStartEnd - startDecorationToken.start - decoration.offset;
        return;
      }

      Decoration.create(endToken, 0, endLeftAtStartEnd - endToken.start, SELECTION_COLOR_ID, 'selection');
      if (Caret.rangeEndsDecoration === null)
        Caret.rangeEndsDecoration = { start: null, end: endToken };
      else
        Caret.rangeEndsDecoration.end = endToken;
    }

    function createExtensionOfLineBreakForEmptyLine(top: number) {
      const element = document.createElement('span');
      element.classList.add('extensionOfLineBreakForEmptyLine');
      document.getElementById('line' + Lines.lines[top].lineId.toString())?.appendChild(element);
    }

    function isHeadOfToken(left: number, top: number, leftAtStartEnd: number) {
      if (left === 0 || Lines.lines[top].tokens.length === 0 || left === Lines.lines[top].length)
        return true;
      return Lines.lines[top].tokens.some(token => token.start === leftAtStartEnd);
    }
  }
  public static clearSelection(isClearRangeStart = true) {
    if (this.rangeStart !== null) {
      if (isClearRangeStart)
        this.rangeStart = null;
      document.querySelectorAll('.selection').forEach(element => element.classList.remove('selection'));
      document.querySelectorAll('.extensionOfLineBreak').forEach(element => element.classList.remove('extensionOfLineBreak'));
      document.querySelectorAll('.extensionOfLineBreakForEmptyLine').forEach(element => element.remove());
      this.removeEndsDecoration();
    }
  }

  private static removeEndsDecoration() {
    if (this.rangeEndsDecoration !== null) {
      this.rangeEndsDecoration.start?.deleteSelectionDecoration();
      this.rangeEndsDecoration.end?.deleteSelectionDecoration();
      this.rangeEndsDecoration = null;
    }
  }
}

class Lines {
  private static lastLineId: number = 0;
  static lines: Line[] = [];

  public static appendLine(text: string = '') {
    const line = new Line(Lines.lastLineId++);
    Lines.lines.push(line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const lineNumber = document.createElement('span');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = Lines.lines.length.toString();
    newLine.append(lineNumber);
    document.getElementById('editorSpace')?.appendChild(newLine);

    let textIndexOffset: number | undefined = undefined;
    for (let i = Lines.lines.length - 2; i >= 0; i--) {
      if (Lines.lines[i].tokens.length > 0) {
        textIndexOffset = Lines.lines[i].tokens[Lines.lines[i].tokens.length - 1].end;
        break;
      }
    }
    Line.splitTextAndCreateToken(text, Lines.lines.length - 1, 0, false, textIndexOffset);

    this.updateLineNumberWidth();
  }
  public static insertLine(top: number, text: string = '') {
    const line = new Line(Lines.lastLineId++);
    Lines.lines.splice(top, 0, line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const lineNumber = document.createElement('span');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = (top + 1).toString();
    newLine.append(lineNumber);
    if (top === 0)
      document.getElementById('editorSpace')?.insertBefore(newLine, document.getElementById('editorSpace')?.firstChild!);
    else if (top === Lines.lines.length - 1)
      document.getElementById('editorSpace')?.appendChild(newLine);
    else
      document.getElementById('editorSpace')?.insertBefore(newLine, document.getElementById('line' + this.lines[top + 1].lineId.toString()));

    let textIndexOffset: number | undefined = undefined;
    for (let i = top - 1; i >= 0; i--) {
      if (Lines.lines[i].tokens.length > 0) {
        textIndexOffset = Lines.lines[i].tokens[Lines.lines[i].tokens.length - 1].end;
        break;
      }
    }
    Line.splitTextAndCreateToken(text, top, 0, false, textIndexOffset);

    this.updateLineNumber(top + 1);
    this.updateLineNumberWidth();
  }
  public static deleteLine(top: number, changeStartEnd = true) {
    const length = Lines.lines[top].length;
    document.getElementById('line' + this.lines[top].lineId.toString())?.remove();

    for (let token of Lines.lines[top].tokens) {
      token.delete();
    }

    Lines.lines.splice(top, 1);

    if (changeStartEnd)
      for (let i = top; i < Lines.lines.length; i++)
        Lines.lines[i].leftOfTokensOffset -= length;

    this.updateLineNumber(top);
  }
  public static swapLine(top: number, length: number, isUp: boolean) {
    if (isUp) {
      if (top === 0)
        return;

      let start = 0;
      for (let i = top - 1; i >= 0; i--) {
        if (Lines.lines[i].tokens.length > 0) {
          start = Lines.lines[i].tokens[0].start;
          break;
        }
      }

      const move = document.getElementById('line' + this.lines[top - 1].lineId.toString());
      if (top + length === this.lines.length)
        document.getElementById('editorSpace')?.appendChild(move!);
      else
        document.getElementById('editorSpace')?.insertBefore(move!, document.getElementById('line' + this.lines[top + length].lineId.toString()));
      Lines.lines.splice(top - 1, 0, ...Lines.lines.splice(top, length));

      let sumLength = 0;
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < Lines.lines[top - 1 + i].tokens.length; j++) {
          Lines.lines[top - 1 + i].tokens[j].start = start + sumLength;
          Lines.lines[top - 1 + i].tokens[j].end = start + sumLength + Lines.lines[top - 1 + i].tokens[j].text.length;
          sumLength += Lines.lines[top - 1 + i].tokens[j].text.length;
        }
      }
      for (let i = 0; i < Lines.lines[top - 1 + length].tokens.length; i++) {
        Lines.lines[top - 1 + length].tokens[i].start = start + sumLength;
        Lines.lines[top - 1 + length].tokens[i].end = start + sumLength + Lines.lines[top - 1 + length].tokens[i].text.length;
        sumLength += Lines.lines[top - 1 + length].tokens[i].text.length;
      }
    } else {
      if (top + length === this.lines.length)
        return;

      let start = 0;
      for (let i = top; i >= 0; i--) {
        if (Lines.lines[i].tokens.length > 0) {
          start = Lines.lines[i].tokens[0].start;
          break;
        }
      }

      const move = document.getElementById('line' + this.lines[top + length].lineId.toString());
      document.getElementById('editorSpace')?.insertBefore(move!, document.getElementById('line' + this.lines[top].lineId.toString()));
      Lines.lines.splice(top + 1, 0, ...Lines.lines.splice(top, length));

      let sumLength = 0;
      for (let i = 0; i < Lines.lines[top].tokens.length; i++) {
        Lines.lines[top].tokens[i].moveLineInfo(top);
        Lines.lines[top].tokens[i].start = start + sumLength;
        Lines.lines[top].tokens[i].end = start + sumLength + Lines.lines[top].tokens[i].text.length;
        sumLength += Lines.lines[top].tokens[i].text.length;
      }
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < Lines.lines[top + 1 + i].tokens.length; j++) {
          Lines.lines[top + 1 + i].tokens[j].moveLineInfo(top + 1);
          Lines.lines[top + 1 + i].tokens[j].start = start + sumLength;
          Lines.lines[top + 1 + i].tokens[j].end = start + sumLength + Lines.lines[top + 1 + i].tokens[j].text.length;
          sumLength += Lines.lines[top + 1 + i].tokens[j].text.length;
        }
      }
    }

    this.updateLineNumber(isUp ? top - 1 : top);
  }

  public static deleteRange(first: { left: number, top: number }, second: { left: number, top: number }) {
    const start = first.top < second.top ? first : (first.top === second.top && first.left < second.left ? first : second);
    const end = first.top < second.top ? second : (first.top === second.top && first.left < second.left ? second : first);
    if (start.top === end.top) {
      Lines.lines[start.top].deleteText(start.left, end.left - start.left);
    } else {
      const caretLeft = start.left;
      const caretTop = start.top;

      const remainText = Lines.lines[start.top].text.slice(0, start.left) + Lines.lines[end.top].text.slice(end.left);

      Lines.insertLine(start.top, remainText);

      for (let i = 0; i < Lines.lines[start.top + 1].tokens.length; i++) {
        for (let j = 0; j < Lines.lines[start.top + 1].tokens[i].decorations.length; j++) {
          const decoration = Lines.lines[start.top + 1].tokens[i].decorations[j];
          let startLeft = Lines.lines[start.top + 1].tokens[i].start - Lines.lines[start.top + 1].tokens[0].start + decoration.offset;
          let endLeft = startLeft + decoration.length;
          if (startLeft !== endLeft) {
            if (endLeft > start.left)
              endLeft = start.left;
            Decorations.create(startLeft, start.top, endLeft - startLeft, decoration.colorId, decoration.type, decoration.decorationGroupId);
          }
        }
      }
      for (let i = 0; i < Lines.lines[end.top + 1].tokens.length; i++) {
        for (let j = 0; j < Lines.lines[end.top + 1].tokens[i].decorations.length; j++) {
          const decoration = Lines.lines[end.top + 1].tokens[i].decorations[j];
          let startLeft = Lines.lines[end.top + 1].tokens[i].start - Lines.lines[end.top + 1].tokens[0].start + decoration.offset - (end.left - start.left);
          let endLeft = startLeft + decoration.length;

          if (startLeft !== endLeft) {
            if (startLeft < 0)
              startLeft = 0;
            Decorations.create(startLeft, start.top, endLeft - startLeft, decoration.colorId, decoration.type, decoration.decorationGroupId);
          }
        }
      }

      for (let i = end.top + 1; i >= start.top + 1; i--) {
        Lines.deleteLine(i);
      }

      for (let i = start.top + 1; i < Lines.lines.length; i++) {
        Lines.lines[i].leftOfTokensOffset += remainText.length;
      }

      Caret.set(caretLeft, caretTop);
    }

    this.updateLineNumber(start.top);
    this.updateLineNumberWidth();
  }

  private static updateLineNumber(top: number) {
    for (let i = top; i < Lines.lines.length; i++)
      document.getElementById('line' + this.lines[i].lineId.toString())!.children[0].textContent = (i + 1).toString();
  }
  private static lineNumberWidth = 4;
  private static updateLineNumberWidth() {
    const textLength = Lines.lines.length.toString().length;
    let lineNumberWidth = textLength <= 4 ? 4 : textLength;
    if (lineNumberWidth !== Lines.lineNumberWidth) {
      Lines.lineNumberWidth = lineNumberWidth;
      document.documentElement.style.setProperty('--line-number-width', `${lineNumberWidth}ch`);
      Caret.set(Caret.left, Caret.top);
    }
  }
}

/*const matchWhiteSpace = /\s/;
const matchAllWhiteSpaceString = /^\s+$/;
const matchWhiteSpaceString = /\s+/g;*/
const separateByKeyword = /[\w\p{sc=Hiragana}\r{sc=Katakana}\p{sc=Han}、。￥・！”＃＄％＆’（）＊＋，．ー／：；＜＝＞？＠＿‘＾｜～「」｛｝［］【】≪≫《》〈〉〔〕]+|\r\n|\r|\n|([^\S\r\n]+)|==|!==|<=|>=|&&|\|\||=>|\+\+|--|\+=|-=|\*=|\/=|%=|\?\.|!\.|\?\?|\?\?=|>>>|<<|>>|<<=|>>=|>>>=|&=|\^=|\|=|::|\.\.|->|\W/gu;
const commentRegex = /(?:(\/\/.*?)(?:\r\n|\r|\n))|(\/\/.*?$)|(\/\*.*?\*\/)/yms;
const stringLiteralRegex = /(?:(\$@"|@\$"|@\"|@")((?:(?:[^\+\r\n,;]*?)(?:"")*)*)(?:(?:,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>)|(")))|(?:((?<!@)\$?)(")((?:[^"\\]|\\.)*?)(?:(?:(?<!\\)(\\\\)*[;,]|(?= *?(?:\r\n|\r|\n|$|\+|==|!=|<=|>=|=>)))|(?<!\\)(\\\\)*(")))/y;
const rawStringLiteralRegex = /(?<!@)(?<!\$)(\$+?@?|@?\$+?)?(`.*?(?<!\\)`|(?<quote>"{3,}).*?\k<quote>(?!\"))/yms;
const charLiteralRegex = /(')([^ \r\n]+?)(?:(')|(?: |,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>))/y;
// 厳密な判定を行うなら↓
// const charLiteralRegex = /(')(?:(\\x[0-9A-Fa-f]{1,4})|(\\u[0-9A-Fa-f]{4})|(\\U[0-9A-Fa-f]{8})|(\\['"\\0abefnrtv]))(?:(')|(?: |,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>))/g;
class Line {
  public constructor(lineId: number, tokens?: Token[]) {
    this.lineId = lineId;
    if (tokens !== undefined)
      this.tokens = tokens;
  }

  readonly lineId: number;
  private _tokens: Token[] = [];
  public leftOfTokensOffset = 0;

  get tokens() {
    return this._tokens;
  }
  set tokens(tokens: Token[]) {
    for (let oldToken of this._tokens) {
      oldToken.delete();
    }

    this._tokens = tokens;

    const lineElement = document.getElementById('line' + this.lineId.toString());
    if (lineElement === null) return;
    for (let element of lineElement.children) {
      if (element.classList.contains('token'))
        element.remove();
    }

    for (let token of this.tokens) {
      const newToken = document.createElement('span');
      newToken.id = `token${token.tokenId}`;
      newToken.classList.add('token');
      const textElement = document.createElement('span');
      textElement.textContent = token.text;
      newToken.append(textElement);
      lineElement.appendChild(newToken);
    }
  }

  get text() {
    return this.tokens.map(token => token.text).join('');
  }

  get length() {
    return this.tokens.reduce((acc, token) => acc + token.text.length, 0);
  }

  /**
   * 文字列をトークン単位に分割し、HTML要素を作成し、かつLines.lineに追加する
   * @param text 分割する文字列
   * @param top トークンを追加する行番号
   * @param insertIndex 行の中でのトークンの追加位置
   * @param appendToLineLater 後で戻り値に含まれる関数を使用して行に追加するか（関数実行時の環境でトークンが作成される）
   * @param textIndexOffset token.startとtoken.endの値に加算する値
   * @returns token: 追加されたトークン, element: 作成されたトークンのHTML要素, appendToLineFunc: 行にトークンを追加する関数（appendToLineLaterがtrueの場合のみ）
   */
  public static splitTextAndCreateToken(text: string, top: number, insertIndex: number, appendToLineLater = false, textIndexOffset = 0) {
    interface Word {
      text: string;
      start: number;
      end: number;
      category: Category | undefined;
      kind?: Kind | undefined;
    }
    const words: Word[] = [];
    let match: RegExpExecArray | null;
    let matchPreviousNumberLiteral: RegExpExecArray | null = null;
    let matchPreviousDecimalPoint: RegExpExecArray | null = null;
    while ((match = separateByKeyword.exec(text)) != null) {
      let category: Category;
      let kind: Kind | undefined;
      if (match[1] === undefined) {
        if (matchPreviousNumberLiteral !== null) {
          if (match[0] === '.') {
            if (matchPreviousDecimalPoint !== null)
              throw new SyntaxError({ content: '.', start: matchPreviousDecimalPoint.index, end: 1 }, 'Unexpected decimal point');
            matchPreviousDecimalPoint = match;
            continue;
          } else {
            if (matchPreviousDecimalPoint !== null) {
              if (isNaN(Number(match[0][0])) === false) {
                words.push({
                  text: matchPreviousNumberLiteral[0] + matchPreviousDecimalPoint[0] + match[0],
                  start: matchPreviousNumberLiteral.index + textIndexOffset,
                  end: matchPreviousDecimalPoint.index + matchPreviousDecimalPoint[0].length + match[0].length + textIndexOffset,
                  category: 'number_literal',
                  kind: 'literal.number',
                });
                matchPreviousNumberLiteral = null;
                matchPreviousDecimalPoint = null;
                continue;
              } else {
                words.push({
                  text: matchPreviousNumberLiteral[0],
                  start: matchPreviousNumberLiteral.index + textIndexOffset,
                  end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
                  category: 'number_literal',
                  kind: 'literal.number',
                });
                words.push({
                  text: matchPreviousDecimalPoint[0],
                  start: matchPreviousDecimalPoint.index + textIndexOffset,
                  end: matchPreviousDecimalPoint.index + matchPreviousDecimalPoint[0].length + textIndexOffset,
                  category: 'operator',
                });
                matchPreviousNumberLiteral = null;
                matchPreviousDecimalPoint = null;
              }
            } else {
              words.push({
                text: matchPreviousNumberLiteral[0],
                start: matchPreviousNumberLiteral.index + textIndexOffset,
                end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
                category: 'number_literal',
                kind: 'literal.number',
              });
              matchPreviousNumberLiteral = null;
            }
          }
        }
        if (match[0] === '\r\n' || match[0] == '\n') {
          category = 'line_break';
        } else if (operators.has(match[0])) {
          category = 'operator';
        } else if (keywords.has(match[0])) {
          category = 'keyword';
          kind = kindOfKeywordOrModifier(match[0]);
        } else if (contextKeywords.has(match[0])) {
          category = 'context_keyword';
          kind = kindOfKeywordOrModifier(match[0]);
        } else {
          if (isNaN(Number(match[0][0])) === false) {
            if (matchPreviousNumberLiteral !== null)
              throw new SyntaxError({ content: match[0][0], start: match.index, end: match.index + match.length }, 'Unexpected number literal');
            matchPreviousNumberLiteral = match;
            continue;
          } else {
            category = undefined;
          }
        }
      } else {
        if (matchPreviousNumberLiteral !== null) {
          words.push({
            text: matchPreviousNumberLiteral[0],
            start: matchPreviousNumberLiteral.index + textIndexOffset,
            end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
            category: 'number_literal',
            kind: 'literal.number',
          });
          matchPreviousNumberLiteral = null;
        }
        category = 'space';
      }
      words.push({
        text: match[0],
        start: match.index + textIndexOffset,
        end: match.index + match[0].length + textIndexOffset,
        category,
        kind,
      });
    }
    if (matchPreviousNumberLiteral !== null) {
      words.push({
        text: matchPreviousNumberLiteral[0],
        start: matchPreviousNumberLiteral.index + textIndexOffset,
        end: matchPreviousNumberLiteral.index + matchPreviousNumberLiteral[0].length + textIndexOffset,
        category: 'number_literal',
        kind: 'literal.number',
      });
      matchPreviousNumberLiteral = null;
      if (matchPreviousDecimalPoint !== null) {
        words.push({
          text: matchPreviousDecimalPoint[0],
          start: matchPreviousDecimalPoint.index + textIndexOffset,
          end: matchPreviousDecimalPoint.index + matchPreviousDecimalPoint[0].length + textIndexOffset,
          category: 'operator',
        });
        matchPreviousDecimalPoint = null;
      }
    }

    const result: { token: Token, element: HTMLSpanElement, appendToLineFunc?: () => void }[] = [];

    for (let i = 0; i < text.length;) {
      commentRegex.lastIndex = i;
      stringLiteralRegex.lastIndex = i;
      rawStringLiteralRegex.lastIndex = i;
      charLiteralRegex.lastIndex = i;

      let commentPosition = findComment(text);
      let stringLiteralPosition = findStringLiteral(text);
      let rawStringLiteralPosition = findRawStringLiteral(text);
      let charLiteralPosition = findCharLiteral(text);

      if (commentPosition != null && (stringLiteralPosition == null || commentPosition.start < stringLiteralPosition.start) && (rawStringLiteralPosition == null || commentPosition.start < rawStringLiteralPosition.start) && (charLiteralPosition == null || commentPosition.start < charLiteralPosition.start)) {
        result.push(Token.create(
          top,
          insertIndex++,
          commentPosition.text,
          commentPosition.start + textIndexOffset,
          commentPosition.end + textIndexOffset,
          'comment',
          commentPosition.isBlock ? 'comment.block' : 'comment.line',
          undefined,
          appendToLineLater
        ));
        i = commentPosition.end;
      } else if (stringLiteralPosition != null && (rawStringLiteralPosition == null || stringLiteralPosition.start < rawStringLiteralPosition.start) && (charLiteralPosition == null || stringLiteralPosition.start < charLiteralPosition.start)) {
        result.push(Token.create(
          top,
          insertIndex++,
          stringLiteralPosition.text,
          stringLiteralPosition.start + textIndexOffset,
          stringLiteralPosition.end + textIndexOffset,
          'string_literal',
          'literal.string',
          undefined,
          appendToLineLater
        ));
        i = stringLiteralPosition.end;
      } else if (rawStringLiteralPosition != null && (charLiteralPosition == null || rawStringLiteralPosition.start < charLiteralPosition.start)) {
        result.push(Token.create(
          top,
          insertIndex++,
          rawStringLiteralPosition.text,
          rawStringLiteralPosition.start + textIndexOffset,
          rawStringLiteralPosition.end + textIndexOffset,
          'raw_string_literal',
          'literal.raw-string',
          undefined,
          appendToLineLater
        ));
        i = rawStringLiteralPosition.end;
      } else if (charLiteralPosition != null) {
        result.push(Token.create(
          top,
          insertIndex++,
          charLiteralPosition.text,
          charLiteralPosition.start + textIndexOffset,
          charLiteralPosition.end + textIndexOffset,
          'char_literal',
          'literal.char',
          undefined,
          appendToLineLater
        ));
        i = charLiteralPosition.end;
      } else {
        const current = words.find(s => s.start == i + textIndexOffset);
        if (current != undefined) {
          result.push(Token.create(
            top,
            insertIndex++,
            current.text,
            current.start,
            current.end,
            current.category,
            current.kind,
            undefined,
            appendToLineLater
          ));
          i = current.end - textIndexOffset;
        } else {
          throw new SyntaxError({ content: text[i], start: i, end: i + 1 }, `Unexpected character: ${text[i]}`);
        }
      }
    }

    return result;
  }

  public insertText(text: string, left: number) {
    if (left < 0)
      return;

    const top = Lines.lines.indexOf(this);

    if (this.tokens.length === 0) {
      let textIndexOffset = 0;
      if (top !== 0) {
        for (let i = top - 1; i >= 0; i--) {
          if (Lines.lines[i].tokens.length > 0) {
            textIndexOffset = Lines.lines[i].tokens[Lines.lines[i].tokens.length - 1].end;
            break;
          }
        }
      }
      Line.splitTextAndCreateToken(text, top, 0, false, textIndexOffset);

      for (let i = top + 1; i < Lines.lines.length; i++) {
        Lines.lines[i].leftOfTokensOffset += text.length;
      }
      return;
    }

    const newTokens: Token[] = [];
    const leftAtStartEnd = left + this.tokens[0].start;
    const isHeadOfToken = this.isHeadOfToken(left, leftAtStartEnd);

    let resplitStartIndex: number;
    let resplitEndIndex: number;
    let insertedText: string | undefined = undefined;
    if (isHeadOfToken) {
      resplitStartIndex = this.tokens.findIndex(token => token.start >= leftAtStartEnd) - 1;
      resplitEndIndex = resplitStartIndex + 1;
    } else {
      resplitStartIndex = this.tokens.findIndex(token => token.end > leftAtStartEnd) - 1;
      resplitEndIndex = resplitStartIndex + 1;
    }

    if (resplitStartIndex === -2) {
      resplitStartIndex = this.tokens.length - 1;
      resplitEndIndex = this.tokens.length - 1;
      insertedText = this.text.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + text;
    } else {
      if (resplitStartIndex < 0) {
        resplitStartIndex++;
        if (isHeadOfToken === false)
          resplitEndIndex++;
      }
      if (resplitEndIndex >= this.tokens.length) {
        resplitEndIndex = this.tokens.length - 1;
      }
    }

    const startOfFirstTokenAtLine = this.tokens[0].start;
    const oldDecorations = this.tokens.slice(resplitStartIndex, resplitEndIndex + 1).flatMap(token => token.decorations.map(decoration => [decoration.offset, decoration.length, decoration.colorId, decoration.type, decoration.decorationGroupId, token.start] as [number, number, string, 'selection' | undefined, number | undefined, number]));

    newTokens.push(...this.tokens.slice(0, resplitStartIndex));

    insertedText ??= this.text.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + text + this.text.slice(left, this.tokens[resplitEndIndex].end - this.tokens[0].start);
    for (let i = resplitStartIndex; i <= resplitEndIndex; i++) {
      this.tokens[i].delete();
    }
    const resplit = Line.splitTextAndCreateToken(insertedText, top, 0, true, this.tokens[resplitStartIndex].start);
    newTokens.push(...resplit.map(x => x.token));
    const insertBeforeElement = resplitEndIndex === this.tokens.length - 1 ? null : document.getElementById(`token${this.tokens[resplitEndIndex + 1].tokenId}`);
    const lineElement = document.getElementById(`line${this.lineId}`);
    if (lineElement === null)
      return;
    for (let element of resplit.map(x => x.element)) {
      lineElement.insertBefore(element, insertBeforeElement);
    }

    if (resplitEndIndex < this.tokens.length - 1) {
      this.tokens.slice(resplitEndIndex + 1).forEach(token => {
        token.start += text.length;
        token.end += text.length;
      });
      newTokens.push(...this.tokens.slice(resplitEndIndex + 1));
    }

    for (let i = top + 1; i < Lines.lines.length; i++) {
      Lines.lines[i].leftOfTokensOffset += text.length;
    }

    this._tokens = newTokens;

    for (let decoration of oldDecorations) {
      let start = decoration[5] - startOfFirstTokenAtLine + decoration[0];
      let end = start + decoration[1];
      if (start >= left)
        start += text.length;
      if (end >= left)
        end += text.length;

      if (start !== end) {
        Decorations.create(start, top, end - start, decoration[2], decoration[3], decoration[4]);
      }
    }
  }

  public deleteText(left: number, length: number) {
    if (left === -1) {
      const top = Lines.lines.indexOf(this);
      if (top === 0 || length !== 1)
        return;

      const previousLine = Lines.lines[top - 1];
      if (previousLine.tokens.length === 0) {
        if (this.tokens.length !== 0)
          this.moveTokens(0, this.tokens.length - 1, 0, top - 1, false);
      } else if (this.tokens.length !== 0) {
        const previousLineLength = previousLine.length;
        const lastTokenIndex = previousLine.tokens.length - 1;
        const lastToken = previousLine.tokens[lastTokenIndex];
        const firstToken = this.tokens[0];
        const text = lastToken.text + firstToken.text;

        const decorationsOfLastToken = previousLine.tokens[lastTokenIndex].decorations.map(decoration => ({ offset: decoration.offset, length: decoration.length, colorId: decoration.colorId, type: decoration.type, decorationGroupId: decoration.decorationGroupId }));

        previousLine.deleteToken(lastToken.tokenId);
        Line.splitTextAndCreateToken(text, top - 1, previousLine.tokens.length, false, lastToken.start);
        for (let i = 1; i < this.tokens.length; i++) {
          this.tokens[i].start += this.leftOfTokensOffset - Lines.lines[top - 1].leftOfTokensOffset;
          this.tokens[i].end += this.leftOfTokensOffset - Lines.lines[top - 1].leftOfTokensOffset;
        }
        this.moveTokens(1, this.tokens.length - 1, previousLine.tokens.length, top - 1, false);

        for (let i = 0; i < decorationsOfLastToken.length; i++) {
          const decoration = decorationsOfLastToken[i];
          Decorations.create(decoration.offset + previousLine.tokens[lastTokenIndex].start - previousLine.tokens[0].start, top - 1, decoration.length, decoration.colorId, decoration.type, decoration.decorationGroupId);
        }
        for (let i = 0; i < this.tokens[0].decorations.length; i++) {
          const decoration = this.tokens[0].decorations[i];
          Decorations.create(decoration.offset + previousLineLength, top - 1, decoration.length, decoration.colorId, decoration.type, decoration.decorationGroupId);
        }
      }
      Lines.deleteLine(top, false);
      return;
    }

    if (left < 0 || length <= 0)
      return;

    const top = Lines.lines.indexOf(this);

    if (left === this.length && length === 1) {
      if (top === Lines.lines.length - 1)
        return;

      const nextLine = Lines.lines[top + 1];
      if (nextLine.tokens.length === 0) {
      } else if (this.tokens.length === 0) {
        nextLine.moveTokens(0, nextLine.tokens.length - 1, 0, top, false);
      } else {
        const previousLineLength = this.length;
        const lastTokenIndex = this.tokens.length - 1;
        const lastToken = this.tokens[lastTokenIndex];
        const firstToken = nextLine.tokens[0];
        const text = lastToken.text + firstToken.text;

        const decorationsOfLastToken = this.tokens[lastTokenIndex].decorations;

        this.deleteToken(lastToken.tokenId);
        Line.splitTextAndCreateToken(text, top, this.tokens.length, false, lastToken.start);
        for (let i = 1; i < nextLine.tokens.length; i++) {
          nextLine.tokens[i].start += nextLine.leftOfTokensOffset - this.leftOfTokensOffset;
          nextLine.tokens[i].end += nextLine.leftOfTokensOffset - this.leftOfTokensOffset;
        }
        nextLine.moveTokens(1, nextLine.tokens.length - 1, this.tokens.length, top, false);

        for (let i = 0; i < decorationsOfLastToken.length; i++) {
          const decoration = decorationsOfLastToken[i];
          Decorations.create(decoration.offset + this.tokens[lastTokenIndex].start - this.tokens[0].start, top, decoration.length, decoration.colorId, decoration.type, decoration.decorationGroupId);
        }
        for (let i = 0; i < nextLine.tokens[0].decorations.length; i++) {
          const decoration = nextLine.tokens[0].decorations[i];
          Decorations.create(decoration.offset + previousLineLength, top, decoration.length, decoration.colorId, decoration.type, decoration.decorationGroupId);
        }
      }
      Lines.deleteLine(top + 1, false);
      return;
    }

    const newTokens: Token[] = [];
    const leftAtStartEnd = left + this.tokens[0].start;
    const firstDeleteTargetTokenIndex = this.tokens.findIndex(token => token.end > leftAtStartEnd && token.start <= leftAtStartEnd);
    if (firstDeleteTargetTokenIndex === -1)
      return;
    let lastDeleteTargetTokenIndex = this.tokens.findIndex(token => token.start >= leftAtStartEnd + length);
    if (lastDeleteTargetTokenIndex === -1)
      lastDeleteTargetTokenIndex = this.tokens.length - 1;

    if (firstDeleteTargetTokenIndex >= 2) {
      newTokens.push(...this.tokens.slice(0, firstDeleteTargetTokenIndex - 1));
    }

    const resplitStartIndex = firstDeleteTargetTokenIndex === 0 ? 0 : firstDeleteTargetTokenIndex - 1;
    const resplitEndIndex = lastDeleteTargetTokenIndex;

    const startOfFirstTokenAtLine = this.tokens[0].start;
    const oldDecorations = this.tokens.slice(resplitStartIndex, resplitEndIndex + 1).flatMap(token => token.decorations.map(decoration => [decoration.offset, decoration.length, decoration.colorId, decoration.type, decoration.decorationGroupId, token.start] as [number, number, string, 'selection' | undefined, number | undefined, number]));

    const deletedText = this.text.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + this.text.slice(left + length, this.tokens[resplitEndIndex].end - this.tokens[0].start);
    for (let i = resplitStartIndex; i <= resplitEndIndex; i++) {
      this.tokens[i].delete();
    }
    const resplit = Line.splitTextAndCreateToken(deletedText, top, 0, true, this.tokens[resplitStartIndex].start);
    newTokens.push(...resplit.map(x => x.token));
    const insertBeforeElement = resplitEndIndex === this.tokens.length - 1 ? null : document.getElementById(`token${this.tokens[resplitEndIndex + 1].tokenId}`);
    const lineElement = document.getElementById(`line${this.lineId}`);
    if (lineElement === null)
      return;
    for (let element of resplit.map(x => x.element)) {
      lineElement.insertBefore(element, insertBeforeElement);
    }

    if (lastDeleteTargetTokenIndex < this.tokens.length - 1) {
      this.tokens.slice(lastDeleteTargetTokenIndex + 1).forEach(token => {
        token.start -= length
        token.end -= length;
      });
      newTokens.push(...this.tokens.slice(lastDeleteTargetTokenIndex + 1));
    }

    for (let i = top + 1; i < Lines.lines.length; i++) {
      Lines.lines[i].leftOfTokensOffset -= length;
    }

    this._tokens = newTokens;

    const newTextLength = this.text.length;
    for (let decoration of oldDecorations) {
      let start = decoration[5] - startOfFirstTokenAtLine + decoration[0];
      let end = start + decoration[1];
      if (start >= left + length)
        start -= length;
      if (end >= left + length)
        end -= length;

      if (start !== end && start < newTextLength) {
        if (end > newTextLength)
          end = newTextLength;
        Decorations.create(start, top, end - start, decoration[2], decoration[3], decoration[4]);
      }
    }
  }

  private isHeadOfToken(left: number, leftAtStartEnd: number) {
    if (left === 0 || this.tokens.length === 0 || left === this.length)
      return true;
    return this.tokens.some(token => token.start === leftAtStartEnd);
  }

  public moveTokens(fromStartIndex: number, fromEndIndex: number, toIndex: number, toTop: number, changeStartEnd = true) {
    const top = Lines.lines.indexOf(this);
    if (top === toTop)
      return;

    const originalToIndex = toIndex;
    const lineElement = document.getElementById(`line${Lines.lines[toTop].lineId}`);
    if (lineElement === null)
      return;
    const isInsertAtEnd = toIndex === Lines.lines[toTop].tokens.length;

    let leftAtStartEnd: number = 0;
    if (Lines.lines[toTop].tokens.length > 0 && Lines.lines[toTop].tokens[toIndex]) {
      leftAtStartEnd = Lines.lines[toTop].tokens[toIndex].start;
    } else {
      for (let i = toTop; i >= 0; i--) {
        if (Lines.lines[i].tokens.length > 0) {
          leftAtStartEnd = Lines.lines[i].tokens[Lines.lines[i].tokens.length - 1].end + Lines.lines[toTop].tokens.slice(0, toIndex).reduce((acc, token) => acc + token.text.length, 0);
          break;
        }
      }
    }

    let length = 0;
    for (let token of this.tokens.slice(fromStartIndex, fromEndIndex + 1)) {
      token.moveLineInfo(toTop);
      Lines.lines[toTop].tokens.splice(toIndex++, 0, token);
      if (changeStartEnd) {
        token.start = leftAtStartEnd + length;
        token.end = leftAtStartEnd + length + token.text.length;
      }
      length += token.text.length;

      const tokenElement = document.getElementById(`token${token.tokenId}`);
      if (tokenElement === null)
        return;
      tokenElement.remove();
      if (isInsertAtEnd)
        lineElement.appendChild(tokenElement);
      else
        lineElement.insertBefore(tokenElement, lineElement.childNodes[originalToIndex]);
    }
    this._tokens.splice(fromStartIndex, fromEndIndex - fromStartIndex + 1);

    if (changeStartEnd) {
      for (let i = toIndex + fromEndIndex - fromStartIndex; i < Lines.lines[toTop].tokens.length; i++) {
        Lines.lines[toTop].tokens[i].start += length;
        Lines.lines[toTop].tokens[i].end += length;
      }

      for (let i = fromStartIndex; i < this.tokens.length; i++) {
        this.tokens[i].start -= length;
        this.tokens[i].end -= length;
      }

      if (top > toTop) {
        for (let i = toTop + 1; i <= top; i++) {
          Lines.lines[i].leftOfTokensOffset += length;
        }
      } else {
        for (let i = top; i < toTop; i++) {
          Lines.lines[i].leftOfTokensOffset -= length;
        }
      }
    }
  }

  public startNewLine(left: number) {
    const top = Lines.lines.indexOf(this);
    if (left === 0) {
      Lines.insertLine(top + 1);
      if (this.tokens.length !== 0)
        this.moveTokens(0, this.tokens.length - 1, 0, top + 1, false);
      Caret.set(0, top + 1);
      return;
    } else if (left === this.length) {
      Lines.insertLine(top + 1);
      Caret.set(0, top + 1);
      return;
    }

    const tokenFromLeft = this.getTokenFromLeft(left);
    if (tokenFromLeft === null)
      return;
    if (tokenFromLeft.isHeadOfToken) {
      Lines.insertLine(top + 1);
      this.moveTokens(tokenFromLeft.index, this.tokens.length - 1, 0, top + 1, false);
    } else {
      const target = this.tokens[tokenFromLeft.index];

      let targetInNextLineText: string;
      if (this.tokens.length === tokenFromLeft.index + 1) {
        targetInNextLineText = target.text.slice(left - tokenFromLeft.leftOfTokenAtLine);

        const targetInThisLineText = target.text.slice(0, left - tokenFromLeft.leftOfTokenAtLine);
        const targetStart = target.start;
        this.deleteToken(target.tokenId);

        Line.splitTextAndCreateToken(targetInThisLineText, top, tokenFromLeft.index, false, targetStart);

        Lines.insertLine(top + 1, targetInNextLineText);
      } else {
        targetInNextLineText = target.text.slice(left - tokenFromLeft.leftOfTokenAtLine) + this.tokens[tokenFromLeft.index + 1].text;

        const afterDeleteTokenId = this.tokens[tokenFromLeft.index + 1].tokenId;

        Lines.insertLine(top + 1, targetInNextLineText);

        const targetInThisLineText = target.text.slice(0, left - tokenFromLeft.leftOfTokenAtLine);

        let leftAtStartEnd = 0;
        for (let i = top; i >= 0; i--) {
          if (Lines.lines[i].tokens.length > 0) {
            leftAtStartEnd = Lines.lines[i].tokens[0].start + left;
            break;
          }
        }

        this.moveTokens(tokenFromLeft.index + 2, this.tokens.length - 1, Lines.lines[top + 1].tokens.length, top + 1, false);

        Line.splitTextAndCreateToken(targetInThisLineText, top, tokenFromLeft.index, false, target.start);

        this.deleteToken(afterDeleteTokenId);
        this.deleteToken(target.tokenId);

        let length = 0;
        for (let i = 0; i < Lines.lines[top + 1].tokens.length; i++) {
          Lines.lines[top + 1].tokens[i].start = leftAtStartEnd - left + this.length + length;
          Lines.lines[top + 1].tokens[i].end = leftAtStartEnd - left + this.length + length + Lines.lines[top + 1].tokens[i].text.length;
          length += Lines.lines[top + 1].tokens[i].text.length;
        }
      }
    }
    Caret.set(0, top + 1);
  }

  private deleteToken(tokenId: number) {
    const index = this.tokens.findIndex(token => token.tokenId === tokenId);
    if (index === -1)
      return;
    this.tokens[index].delete();
    this.tokens.splice(index, 1);
  }

  private getTokenFromLeft(left: number): { token: Token, leftOfTokenAtLine: number, index: number, isHeadOfToken: boolean } | null {
    let length = 0;
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (length + token.text.length > left) {
        return { token, leftOfTokenAtLine: length, index: i, isHeadOfToken: length === left };
      }
      length += token.text.length;
    }
    return null;
  }
}
class Token extends EventEmitter {
  private static lastTokenId: number = 0;

  public readonly tokenId: number;
  public readonly element: HTMLSpanElement | undefined;
  private _text: string = '';
  private _start: number;
  private _end: number;
  public category: Category;
  private _kind: Kind | undefined = undefined;
  public decorations: Decoration[] = [];
  public data?: any;
  public line: Line;

  private constructor(element: HTMLSpanElement | undefined, text: string, start: number, end: number, category: Category, kind: Kind | undefined, decorations: Decoration[] | undefined, line: Line) {
    super();

    this.tokenId = Token.lastTokenId++;
    this.element = element;
    this._text = text;
    this._start = start;
    this._end = end;
    this.category = category;
    this._kind = kind;
    if (decorations !== undefined)
      this.decorations = decorations;
    this.line = line;
  }

  /**
   * トークンを作成する
   * @param top 行番号
   * @param insertIndex 行の中での挿入位置
   * @param text トークンの文字列（事前にトークン単位に文字列を分割しておくこと）
   * @param start 全文字列の中での開始位置
   * @param end 全文字列の中での終了位置
   * @param category 
   * @param kind 
   * @param decorations 作成するトークンのdecorationsに追加するDecoration
   * @param appendToLineLater 後で戻り値に含まれる関数を使用して行に追加するか（関数実行時の環境でトークンが作成される）
   * @returns token: 作成されたトークン, element: 作成されたトークンのHTML要素, appendToLineFunc: 行にトークンを追加する関数（appendToLineLaterがtrueの場合のみ）
   */
  public static create(top: number, insertIndex: number | null, text: string, start: number, end: number, category: Category, kind: Kind | undefined, decorations?: Decoration[], appendToLineLater = false): { token: Token, element: HTMLSpanElement, appendToLineFunc?: () => void } {
    const element = createElement();
    const token = new Token(element, text, start - Lines.lines[top].leftOfTokensOffset, end - Lines.lines[top].leftOfTokensOffset, category, kind, decorations, Lines.lines[top]);
    let tokenIdAtInsertIndex: number | null = null;
    tokenIdAtInsertIndex = insertIndex === null || Lines.lines[top].tokens.length <= insertIndex ? null : Lines.lines[top].tokens[insertIndex].tokenId;
    if (appendToLineLater) {
      if (tokenIdAtInsertIndex === null)
        return {
          token,
          element,
          appendToLineFunc: () => {
            Lines.lines[top].tokens.push(token);
            document.getElementById(`line${Lines.lines[top].lineId}`)?.appendChild(element);
          }
        };
      else
        return {
          token,
          element,
          appendToLineFunc: () => {
            Lines.lines[top].tokens.splice(insertIndex!, 0, token);
            document.getElementById(`line${Lines.lines[top].lineId}`)?.insertBefore(element, document.getElementById(`token${tokenIdAtInsertIndex}`)!);
          }
        };
    } else {
      Lines.lines[top].tokens.splice(insertIndex === null ? Lines.lines[top].tokens.length : insertIndex, 0, token);
      if (tokenIdAtInsertIndex === null)
        document.getElementById(`line${Lines.lines[top].lineId}`)?.appendChild(element);
      else
        document.getElementById(`line${Lines.lines[top].lineId}`)?.insertBefore(element, document.getElementById(`token${tokenIdAtInsertIndex}`)!);
      return { token, element };
    }

    function createElement() {
      const element: HTMLSpanElement = document.createElement('span');
      element.id = `token${Token.lastTokenId}`;
      element.classList.add('token');
      const textElement = document.createElement('span');
      textElement.textContent = text;
      element.appendChild(textElement);
      return element;
    }
  }

  public get text() {
    return this._text;
  }
  public set text(text: string) {
    if (text !== this._text) {
      this._text = text;
      if (this.element !== undefined)
        this.element.children[this.element.children.length - 1].textContent = text;
      super.emit('changed');
    }
  }

  public get start() {
    return this._start + this.line.leftOfTokensOffset;
  }
  public set start(start: number) {
    this._start = start - this.line.leftOfTokensOffset;
    super.emit('changed');
  }

  public get end() {
    return this._end + this.line.leftOfTokensOffset;
  }
  public set end(end: number) {
    this._end = end - this.line.leftOfTokensOffset;
    super.emit('changed');
  }

  public get kind() {
    return this._kind;
  }
  public set kind(kind: Kind | undefined) {
    this._kind = kind;
  }

  public delete() {
    this.element?.remove();
    for (let decoration of this.decorations) {
      decoration.delete();
    }
  }

  public deleteSelectionDecoration() {
    for (let decoration of this.decorations) {
      if (decoration.type === 'selection') {
        decoration.delete();
        return;
      }
    }
  }

  public moveLineInfo(top: number) {
    this.line = Lines.lines[top];
  }
}

interface Color {
  id: string;
  color: string;
}

class Colors {
  static colors: Color[] = [];
}
class BackgroundColors {
  static colors: Color[] = [{ id: SELECTION_COLOR_ID, color: '#46f9ff55' }];
}
class Decorations {
  public static create(left: number, top: number, length: number, colorId: string, type?: 'selection', decorationGroupId?: number) {
    if (Lines.lines[top].tokens.length === 0 || length <= 0)
      return;

    const leftAtStartEnd = left + Lines.lines[top].tokens[0].start;

    const firstTokenIndex = Lines.lines[top].tokens.findIndex(token => token.end > leftAtStartEnd);
    if (firstTokenIndex === -1)
      return;
    let lastTokenIndex = findLastIndex(Lines.lines[top].tokens, token => token.start < leftAtStartEnd + length);
    const decorations: Decoration[] = [];
    if (lastTokenIndex === -1) {
      lastTokenIndex = Lines.lines[top].tokens.length - 1;
    }

    if (firstTokenIndex === lastTokenIndex) {
      decorations.push(Decoration.create(Lines.lines[top].tokens[firstTokenIndex], leftAtStartEnd - Lines.lines[top].tokens[firstTokenIndex].start, length, colorId, type).decoration);
    } else {
      decorations.push(Decoration.create(Lines.lines[top].tokens[firstTokenIndex], leftAtStartEnd - Lines.lines[top].tokens[firstTokenIndex].start, Lines.lines[top].tokens[firstTokenIndex].text.length - (leftAtStartEnd - Lines.lines[top].tokens[firstTokenIndex].start), colorId, type).decoration);
      for (let i = firstTokenIndex + 1; i < lastTokenIndex; i++)
        decorations.push(Decoration.create(Lines.lines[top].tokens[i], 0, Lines.lines[top].tokens[i].text.length, colorId, type).decoration);
      decorations.push(Decoration.create(Lines.lines[top].tokens[lastTokenIndex], 0, leftAtStartEnd + length - Lines.lines[top].tokens[lastTokenIndex].start, colorId, type).decoration);
    }

    DecorationGroup.createOrAppend(decorations, decorationGroupId);
  }
}
class DecorationGroup {
  private static lastDecorationGroupId: number = 0;

  public static decorationGroups: DecorationGroup[] = [];

  public readonly decorationGroupId: number;
  public readonly decorationIds: number[] = [];

  private constructor(decorationIds: number[], decorationGroupId?: number) {
    this.decorationGroupId = decorationGroupId ?? DecorationGroup.lastDecorationGroupId++;
    this.decorationIds = decorationIds;
    DecorationGroup.decorationGroups.push(this);
  }

  public static create(decorations: Decoration[], decorationGroupId?: number) {
    decorationGroupId ??= DecorationGroup.lastDecorationGroupId++;
    const decorationGroup = new DecorationGroup(decorations.map(x => x.decorationId), decorationGroupId);
    decorations.forEach(decoration => decoration.decorationGroupId = decorationGroupId);
    return decorationGroup;
  }

  public static createOrAppend(decorations: Decoration[], decorationGroupId?: number) {
    decorationGroupId ??= DecorationGroup.lastDecorationGroupId++;
    const exist = DecorationGroup.decorationGroups.find(x => x.decorationGroupId === decorationGroupId);
    if (exist === undefined) {
      this.create(decorations, decorationGroupId);
    } else {
      exist.decorationIds.push(...decorations.map(x => x.decorationId).filter(x => exist.decorationIds.includes(x) === false));
    }
  }

  public static remove(decorationGroupId: number, decorationId: number) {
    const group = DecorationGroup.decorationGroups.find(x => x.decorationGroupId === decorationGroupId);
    if (group === undefined)
      return;
    const decorationIndex = group.decorationIds.findIndex(x => x === decorationId);
    if (decorationIndex === -1)
      return;
    group.decorationIds.splice(decorationIndex, 1);
  }
}
class Decoration {
  private static lastDecorationId: number = 0;

  public readonly decorationId: number;
  public readonly element: HTMLSpanElement;
  private _token: Token | undefined;
  private _offset: number;
  private _length: number;
  private _colorId: string;
  public type: 'selection' | undefined;
  public _decorationGroupId: number | undefined;

  private constructor(element: HTMLSpanElement, token: Token, offset: number, length: number, colorId: string, type?: 'selection', decorationGroupId?: number) {
    this.decorationId = Decoration.lastDecorationId++;
    this.element = element;
    this.token = token;
    this._offset = offset;
    this._length = length;
    this._colorId = colorId;
    this.type = type;
    this._decorationGroupId = decorationGroupId;
  }

  public static create(token: Token, offset: number, length: number, colorId: string, type: 'selection' | undefined, decorationGroupId?: number, extensionOfLineBreak = false): { decoration: Decoration, element: HTMLSpanElement } {
    if (token.element === undefined)
      throw new UnhandledError();

    let element: HTMLSpanElement;
    let existingDecoration: Element | null = null;
    let createdNewElement = false;
    if (type === 'selection' && ((existingDecoration = token.element.querySelector('.selection')), existingDecoration !== null)) {
      element = existingDecoration as HTMLSpanElement;
    } else {
      createdNewElement = true;
      element = document.createElement('span');
      element.id = `decoration${Decoration.lastDecorationId}`;
      element.classList.add('decoration');
      if (type === 'selection')
        element.classList.add('selection');
      element.style.background = BackgroundColors.colors.find(color => color.id === colorId)?.color ?? '';
    }

    if (extensionOfLineBreak)
      element.classList.add('extensionOfLineBreak');
    else
      element.classList.remove('extensionOfLineBreak');

    if (offset === 0)
      element.style.left = '0';
    else
      element.style.left = `${measureTextWidth(token.text.slice(0, offset))}px`;
    if (length === 0)
      element.style.width = '0';
    else
      element.style.width = `${measureTextWidth(token.text.slice(offset, offset + length))}px`;

    if (createdNewElement) {
      token.element.prepend(element);
    }

    const decoration = new Decoration(element, token, offset, length, colorId, type, decorationGroupId);

    if (decorationGroupId !== undefined) {
      element.classList.add(`decorationGroup${decorationGroupId}`);
      DecorationGroup.createOrAppend([decoration], decorationGroupId);
    }

    token.decorations.push(decoration);
    return { decoration, element };
  }

  public delete() {
    this.element.remove();
    if (this.decorationGroupId !== undefined)
      DecorationGroup.remove(this.decorationGroupId, this.decorationId);
    this.token.decorations.splice(this.token.decorations.indexOf(this), 1);
  }

  public get token() {
    return this._token!;
  }
  private handler = () => {
    if (this.token.element === undefined)
      return;
    if (this.offset === 0)
      this.element.style.left = this.token.element.style.left;
    else
      this.element.style.left = `${measureTextWidth(this.token.text.slice(0, this.offset))}px`;
    if (this.length === 0)
      this.element.style.width = '0px';
    else
      this.element.style.width = `${measureTextWidth(this.token.text.slice(this.offset, this.offset + this.length))}px`;
  };
  public set token(token: Token) {
    if (this._token !== undefined)
      this._token.off('changed', this.handler);
    this._token = token;
    this._token.on('changed', this.handler);
  }

  public get offset() {
    return this._offset;
  }
  public set offset(offset: number) {
    this._offset = offset;
    if (this.token.element !== undefined) {
      if (offset === 0)
        this.element.style.left = '0';
      else
        this.element.style.left = `${measureTextWidth(this.token.text.slice(this.offset, this.offset + this.length))}px`;
    }
  }

  public get length() {
    return this._length;
  }
  public set length(length: number) {
    this._length = length;
    if (length === 0)
      this.element.style.width = '0';
    else
      this.element.style.width = `${measureTextWidth(this.token.text.slice(this.offset, this.offset + this.length))}px`;
  }

  public get colorId() {
    return this._colorId;
  }
  public set colorId(colorId: string) {
    this._colorId = colorId;
    this.element.style.background = BackgroundColors.colors.find(color => color.id === colorId)?.color ?? '';
  }

  public changeOffsetAndLength(offset: number, length: number) {
    this._offset = offset;
    this._length = length;
    if (this.token.element !== undefined) {
      this.element.style.left = `${measureTextWidth(this.token.text.slice(0, offset))}px`;
      this.element.style.width = `${measureTextWidth(this.token.text.slice(offset, offset + length))}px`;
    }
  }

  public get decorationGroupId() {
    return this._decorationGroupId;
  }
  public set decorationGroupId(decorationGroupId: number | undefined) {
    if (this._decorationGroupId !== decorationGroupId) {
      this.element.classList.remove(`decorationGroup${this._decorationGroupId}`);
      this._decorationGroupId = decorationGroupId;
      if (decorationGroupId !== undefined) {
        this.element.classList.add(`decorationGroup${decorationGroupId}`);
        DecorationGroup.createOrAppend([this], decorationGroupId);
      }
    }
  }
}

class Dialog {
  readonly element: HTMLDivElement;

  constructor(title: string, content: string, buttons: { text: string, onClick: () => void }[]) {
    const template = document.getElementById('dialogTemplate') as HTMLTemplateElement;
    this.element = template.content.firstElementChild!.cloneNode(true) as HTMLDivElement;

    this.element.getElementsByClassName('dialogTitle')[0].textContent = title;
    this.element.getElementsByClassName('dialogContent')[0].textContent = content;
    const dialogButtons = this.element.getElementsByClassName('dialogButtons')[0];
    dialogButtons.innerHTML = '';
    for (let button of buttons) {
      const newButton = document.createElement('button');
      newButton.textContent = button.text;
      newButton.onclick = button.onClick;
      dialogButtons.appendChild(newButton);
    }
  }

  public async show() {
    document.getElementById('contentSpace')?.appendChild(this.element);
    await repaint();
  }
  public hide() {
    this.element.remove();
  }
}


function calculateMousePosition(e: MouseEvent): null | { left: number, top: number } {
  const editorSpace = document.getElementById('editorSpace');
  if (editorSpace === null)
    return null;

  const editorSpaceSize = editorSpace.getBoundingClientRect();
  if (e.clientX < editorSpaceSize.left || e.clientX > editorSpaceSize.left + editorSpace.clientWidth || e.clientY < editorSpaceSize.top || e.clientY > editorSpaceSize.top + editorSpace.clientHeight)
    return null;

  const x = e.clientX - editorSpaceSize.left + editorSpace.scrollLeft;
  const y = e.clientY - editorSpaceSize.top + editorSpace.scrollTop;
  const lineHeightInPixel = parseFloat(getComputedStyle(document.querySelector('.line:not(#lineToMeasure)')!).height!.replace('px', ''));
  const top = Math.floor(y / lineHeightInPixel);

  if (top >= Lines.lines.length) {
    return { left: Lines.lines[Lines.lines.length - 1].length, top: Lines.lines.length - 1 };
  } else {
    const text = Lines.lines[top].text;
    const length = Lines.lines[top].length;

    const styleOfLineNumberElement = getComputedStyle(document.querySelector('.lineNumber')!);
    const marginLeft = parseFloat(styleOfLineNumberElement.width.replace('px', '')) + parseFloat(styleOfLineNumberElement.paddingRight.replace('px', ''));

    if (x <= marginLeft)
      return { left: 0, top };

    const textWidth = measureTextWidth(text);
    if (textWidth + marginLeft <= x)
      return { left: length, top };

    let left = 0;
    let right = length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const width = measureTextWidth(text.slice(0, mid)) + marginLeft;
      const lastCharWidth = mid > 0 ? measureTextWidth(text.slice(mid - 1, mid)) : 0;

      if (width > x + lastCharWidth / 2) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    return { left: left - 1, top };
  }
}

function measureTextWidth(text: string) {
  let lineToMeasure = document.getElementById('lineToMeasure');
  if (lineToMeasure === null) {
    lineToMeasure = document.createElement('div');
    lineToMeasure.id = 'lineToMeasure';
    lineToMeasure.classList.add('line');
    document.getElementById('editorSpace')?.appendChild(lineToMeasure);
  }
  lineToMeasure.textContent = text.replace(/ /g, ' ');
  return lineToMeasure.getBoundingClientRect().width;
}

function findComment(str: string) {
  const captures = commentRegex.exec(str);
  if (captures == null) return null;
  const length = captures.slice(1).reduce((a, b) => a + (b ? b.length : 0), 0)
  return {
    text: str.slice(captures.index, captures.index + length),
    start: captures.index,
    end: captures.index + length,
    isBlock: captures[3] !== undefined
  };
}
function findStringLiteral(str: string) {
  const captures = stringLiteralRegex.exec(str);
  if (captures == null) return null;
  let text, start, end, data;
  if (captures.length === 1) {
    text = captures[0];
    start = captures.index;
    end = captures.index + captures[0].length;
    data = text;
  } else {
    text = data = captures.slice(1).join('');
    let length = captures.slice(1).reduce((a, b) => a + (b ? b.length : 0), 0);
    if ((text.startsWith('@') || text.startsWith('$')) === false && captures.length >= 10 && captures[9] === undefined) {
      data += '"';
    }
    start = captures.index;
    end = captures.index + length;
  }
  return { text, start, end, data };
}
const escapesInRawStringLiteral = /\\`/g;
function findRawStringLiteral(str: string) {
  const captures = rawStringLiteralRegex.exec(str);
  if (captures == null) return null;
  let text = captures[0];
  if (text.endsWith('`')) {
    const startBackQuoteIndex = text.indexOf('`');
    const endBackQuoteIndex = text.lastIndexOf('`');
    let safeMultiQuoteCount = 3;
    for (let i = 3; i < Number.MAX_SAFE_INTEGER; i++) {
      if (text.indexOf('"'.repeat(i)) === -1) {
        safeMultiQuoteCount = i;
        break;
      }
    }
    text = text.slice(0, startBackQuoteIndex) + '"'.repeat(safeMultiQuoteCount) + text.slice(startBackQuoteIndex + 1, endBackQuoteIndex) + '"'.repeat(safeMultiQuoteCount);
    text = text.replace(escapesInRawStringLiteral, '`');
  }
  return {
    text,
    start: captures.index,
    end: captures.index + captures[0].length
  };
}
function findCharLiteral(str: string) {
  const captures = charLiteralRegex.exec(str);
  if (captures == null) return null;
  let text = captures[2];
  return {
    text: "'" + text + (captures[3] ? "'" : ''),
    start: captures.index,
    end: captures.index + text.length + (captures[3] === undefined ? 1 : 2),
    data: "'" + text + "'",
  };
}


let repeatActionInterval: number | null = null;
let repeatActionTimeout: number | null = null;
function repeatAction(action: () => void, intervalToRepeat: number = 750, intervalBetweenActions: number = 100) {
  stopRepeatAction();
  action();
  repeatActionTimeout = setTimeout(() => {
    repeatActionInterval = setInterval(action, intervalBetweenActions);
  }, intervalToRepeat);
}
function stopRepeatAction() {
  if (repeatActionTimeout !== null) {
    clearTimeout(repeatActionTimeout);
    repeatActionTimeout = null;
  }
  if (repeatActionInterval !== null) {
    clearInterval(repeatActionInterval);
    repeatActionInterval = null;
  }
}

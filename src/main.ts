import { Category, Kind, SyntaxError, UnhandledError, contextKeywords, keywords, kindOfKeywordOrModifier, operators } from "./convert";
import { debounce, EventEmitter, repaint, findLast, findLastIndex } from "./functions";

export { Token };


const SELECTION_COLOR_ID = 'selection';

let isLatestCopyNotSelected: false | string = false;
const splitByLineBreak = /\r\n|\r|\n/;

class Pane {
  constructor() {
    this.tokenId = new TokenId();
    this.decorationsData = new DecorationsData();
    this.caret = new Caret(this.decorationsData);
    this.lines = new Lines(this.caret, this.tokenId, this.decorationsData);
    this.caret.lines = this.lines;
  }

  private static lastPaneId = 0;

  public readonly paneId = Pane.lastPaneId++;

  tokenId: TokenId;
  decorationsData: DecorationsData;
  caret: Caret;
  lines: Lines;

  repeatActionTimeout: number | null = null;
  repeatActionInterval: number | null = null;

  keyDown(e: KeyboardEvent) {
    if (!e.metaKey) {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          // repeatAction(this.repeatActionTimeout, this.repeatActionInterval, () => {
            if (e.altKey) {
            } else {
              const left = this.caret.rangeStart === null ? this.caret.left : this.caret.rangeStart.left;
              const top = this.caret.rangeStart === null ? this.caret.top : this.caret.rangeStart.top;
              if (this.caret.rangeStart === null || e.shiftKey) {
                if (e.key === 'ArrowLeft')
                  this.caret.moveLeft();
                else
                  this.caret.moveRight();
              } else {
                if (e.key === 'ArrowLeft') {
                  if (this.caret.top >= this.caret.rangeStart.top && (this.caret.top !== this.caret.rangeStart.top || this.caret.left >= this.caret.rangeStart.left))
                    this.caret.set(this.caret.rangeStart.left, this.caret.rangeStart.top);
                } else {
                  if (this.caret.top <= this.caret.rangeStart.top && (this.caret.top !== this.caret.rangeStart.top || this.caret.left <= this.caret.rangeStart.left))
                    this.caret.set(this.caret.rangeStart.left, this.caret.rangeStart.top);
                }
              }
              if (e.shiftKey)
                this.caret.changeSelection(left, top);
              else
                this.caret.clearSelection();
            }
          // });
          return;
        case 'ArrowUp':
        case 'ArrowDown':
          // repeatAction(this.repeatActionTimeout, this.repeatActionInterval, () => {
            if (e.altKey) {
              if (this.caret.rangeStart !== null) {
                const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
                const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
                if ((e.key === 'ArrowUp' && start.top > 0) || (e.key === 'ArrowDown' && end.top < this.lines.lines.length - 1)) {
                  this.lines.swapLine(start.top, end.top - start.top + 1, e.key === 'ArrowUp');
                  this.caret.set(this.caret.left, this.caret.top + (e.key === 'ArrowUp' ? -1 : 1));
                  this.caret.changeSelection(this.caret.rangeStart.left, this.caret.rangeStart.top + (e.key === 'ArrowUp' ? -1 : 1));
                }
                return;
              }
              if ((e.key === 'ArrowUp' && this.caret.top > 0) || (e.key === 'ArrowDown' && this.caret.top < this.lines.lines.length - 1)) {
                this.lines.swapLine(this.caret.top, 1, e.key === 'ArrowUp');
                this.caret.set(this.caret.left, this.caret.top + (e.key === 'ArrowUp' ? -1 : 1));
              }
            } else {
              const left = this.caret.rangeStart === null ? this.caret.left : this.caret.rangeStart.left;
              const top = this.caret.rangeStart === null ? this.caret.top : this.caret.rangeStart.top;
              if (e.key === 'ArrowUp')
                this.caret.moveUp();
              else
                this.caret.moveDown();
              if (e.shiftKey)
                this.caret.changeSelection(left, top);
              else
                this.caret.clearSelection();
            }
          // });
          return;
        case 'Enter':
          if (e.ctrlKey) {
            if (e.shiftKey) {
              const start = this.caret.rangeStart === null ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top > this.caret.top ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top === this.caret.top ? (this.caret.rangeStart.left > this.caret.left ? { left: this.caret.left, top: this.caret.top } : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }) : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }));
              this.caret.clearSelection();
              if (start.top === 0) {
                this.lines.insertLine(0);
                this.caret.set(0, 0);
              } else {
                this.lines.insertLine(start.top);
                this.caret.set(0, start.top);
              }
            } else {
              const end = this.caret.rangeStart === null ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top < this.caret.top ? { left: this.caret.left, top: this.caret.top } : (this.caret.rangeStart.top === this.caret.top ? (this.caret.rangeStart.left < this.caret.left ? { left: this.caret.left, top: this.caret.top } : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }) : { left: this.caret.rangeStart.left, top: this.caret.rangeStart.top }));
              this.caret.clearSelection();
              this.lines.insertLine(end.top + 1);
              this.caret.set(0, end.top + 1);
            }
          } else {
            if (this.caret.rangeStart !== null) {
              const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
              const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
              this.caret.clearSelection();
              this.caret.set(start.left, start.top);
              this.lines.deleteRange(start, end);
            }
            this.lines.lines[this.caret.top].startNewLine(this.caret.left);
          }
          return;
        case 'Backspace':
          if (this.caret.rangeStart !== null) {
            const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
            const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
            this.caret.clearSelection();
            this.caret.set(start.left, start.top);
            this.lines.deleteRange(start, end);
          } else {
            const topTemp = this.caret.top;
            const leftTemp = this.caret.left;
            this.caret.moveLeft();
            this.lines.lines[topTemp].deleteText(leftTemp - 1, 1);
          }
          return;
        case 'Delete':
          if (!e.shiftKey) {
            if (this.caret.rangeStart !== null) {
              const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
              const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
              this.caret.clearSelection();
              this.caret.set(start.left, start.top);
              this.lines.deleteRange(start, end);
            } else {
              this.lines.lines[this.caret.top].deleteText(this.caret.left, 1);
            }
          }
          return;
      }
    }
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
      if (this.caret.rangeStart !== null) {
        const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
        const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
        this.caret.clearSelection();
        this.lines.deleteRange(start, end);
        this.lines.lines[start.top].insertText(e.key, start.left);
        this.caret.set(start.left + 1, start.top);
      } else {
        this.lines.lines[this.caret.top].insertText(e.key, this.caret.left);
        this.caret.moveRight();
      }
    } else if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      if (e.key === 'v') {
        navigator.clipboard.readText().then(async text => {
          if (text === '')
            return;

          if (text === isLatestCopyNotSelected) {
            const lengthTemp = this.lines.lines[this.caret.top].length;
            this.lines.lines[this.caret.top].insertText(text.slice(0, -2), 0);
            this.lines.lines[this.caret.top].startNewLine(text.length - 2);
            this.caret.set(lengthTemp, this.caret.top);
            return;
          }

          let dialog: Dialog | null = null;
          if (text.length > 1000) {
            dialog = new Dialog('貼り付け中', 'テキストをクリップボードから貼り付け中です。しばらくお待ちください。', []);
            await dialog.show();
          }

          if (this.caret.rangeStart !== null) {
            const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
            const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;
            this.caret.clearSelection();
            this.caret.set(start.left, start.top);
            this.lines.deleteRange(start, end);
          }

          const split = text.split(splitByLineBreak);
          if (split.length === 1) {
            this.lines.lines[this.caret.top].insertText(text, this.caret.left);
            this.caret.set(this.caret.left + text.length, this.caret.top);
          } else {
            const textTemp = this.lines.lines[this.caret.top].text.slice(this.caret.left);

            this.lines.lines[this.caret.top].deleteText(this.caret.left, textTemp.length);
            this.lines.lines[this.caret.top].insertText(split[0], this.caret.left);

            let top = this.caret.top + 1;

            for (let i = 1; i < split.length - 1; i++) {
              this.lines.insertLine(top, split[i]);
              top++;
            }

            this.lines.insertLine(top, split[split.length - 1] + textTemp);

            for (let i = top + 1; i < this.lines.lines.length; i++) {
              this.lines.lines[i].leftOfTokensOffset += split.reduce((a, b) => a + b.length, 0) - split[0].length + textTemp.length;
            }

            this.caret.set(split[split.length - 1].length, top);
          }

          dialog?.hide();
        });
      } else if (e.key === 'c' || e.key === 'x') {
        let text: string;
        if (this.caret.rangeStart !== null) {
          const start = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? this.caret.rangeStart : { left: this.caret.left, top: this.caret.top };
          const end = this.caret.rangeStart.top < this.caret.top || (this.caret.rangeStart.top === this.caret.top && this.caret.rangeStart.left < this.caret.left) ? { left: this.caret.left, top: this.caret.top } : this.caret.rangeStart;

          if (start.top === end.top) {
            text = this.lines.lines[start.top].text.slice(start.left, end.left);
          } else {
            text = this.lines.lines[start.top].text.slice(start.left) + (start.top === end.top - 1 ? '\r\n' : '\r\n' + this.lines.lines.slice(start.top + 1, end.top).map(line => line.text).join('\r\n') + '\r\n') + this.lines.lines[end.top].text.slice(0, end.left);
          }
          isLatestCopyNotSelected = false;

          if (e.key === 'x') {
            this.caret.clearSelection();
            this.caret.set(start.left, start.top);
            this.lines.deleteRange(start, end);
          }
        } else {
          text = this.lines.lines[this.caret.top].text + '\r\n';
          isLatestCopyNotSelected = text;
        }
        navigator.clipboard.writeText(text);
      } else if (e.key === 'a') {
        this.caret.set(0, 0);
        this.caret.changeSelection(this.lines.lines[this.lines.lines.length - 1].length, this.lines.lines.length - 1);
        this.caret.rangeStart = { left: 0, top: 0 };
        this.caret.set(this.lines.lines[this.lines.lines.length - 1].length, this.lines.lines.length - 1);
      }
    }
  }
}

const panes: Pane[] = [];
let selectedPaneId = 0;

document.addEventListener('DOMContentLoaded', () => {
  const pane = new Pane();
  panes.push(pane);

  pane.decorationsData.backgroundColors.push({ id: 'red', color: '#ff000066' });
  pane.decorationsData.backgroundColors.push({ id: 'green', color: '#00ff0066' });
  pane.lines.appendLine();
  pane.caret.set(0, 0);

  pane.lines.lines[0].insertText('C#', 0);

  pane.lines.appendLine('Hello, World!');
  pane.lines.appendLine('こんにちは、世界！');

  Decorations.create(pane.lines, pane.decorationsData, 0, 0, 2, 'green');
  Decorations.create(pane.lines, pane.decorationsData, 1, 1, 8, 'red');

  let errored = false;
  document.onkeydown = (e) => {
    if (e.isComposing || e.keyCode === 243 || e.keyCode === 244) {
      return;
    }

    if (e.key === 'F5' || e.key === 'F12')
      return;

    e.preventDefault();

    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;
    pane.keyDown(e);

    let s = 0;
    for (let i = 0; i < pane.lines.lines.length; i++) {
      for (let j = 0; j < pane.lines.lines[i].tokens.length; j++) {
        if (s !== pane.lines.lines[i].tokens[j].start) {
          if (!errored) {
            alert('See console.');
            errored = true;
          }
          console.log(s === pane.lines.lines[i].tokens[j].start);
          console.log(pane.lines.lines);
        }
        s = pane.lines.lines[i].tokens[j].end;
      }
    }
  };

  document.onkeyup = (e) => {
    if (e.isComposing || e.keyCode === 229) {
      return;
    }

    e.preventDefault();

    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;
    stopRepeatAction(pane.repeatActionTimeout, pane.repeatActionInterval);
  };

  let isMouseDown = false;
  document.onmousedown = (e) => {
    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;

    const position = calculateMousePosition(pane.lines, e);
    if (position === null)
      return;
    if (e.shiftKey) {
      const left = pane.caret.rangeStart === null ? pane.caret.left : pane.caret.rangeStart.left;
      const top = pane.caret.rangeStart === null ? pane.caret.top : pane.caret.rangeStart.top;
      pane.caret.set(position.left, position.top);
      pane.caret.changeSelection(left, top);
    } else {
      pane.caret.clearSelection();
      pane.caret.set(position.left, position.top);
      isMouseDown = true;
    }
  };
  document.onmousemove = (e) => {
    if (isMouseDown === false) return;

    const pane = panes.find(pane => pane.paneId === selectedPaneId)!;
    debounce((e: MouseEvent) => {
      const position = calculateMousePosition(pane.lines, e);
      if (position === null)
        return;
      if (pane.caret.left !== position.left || pane.caret.top !== position.top) {
        const left = pane.caret.rangeStart === null ? pane.caret.left : pane.caret.rangeStart.left;
        const top = pane.caret.rangeStart === null ? pane.caret.top : pane.caret.rangeStart.top;
        pane.caret.set(position.left, position.top);
        pane.caret.changeSelection(left, top);
      }
    }, 50, true)(e);
  };
  document.onmouseup = () => {
    isMouseDown = false;
  };
});

class Caret {
  constructor(private decorationsData: DecorationsData) { }
  public lines: Lines | undefined = undefined;

  private _left: number = 0;
  // テキストが変更されたら、_leftTemp、_topOfLeftTempをnullにする
  private _leftTemp: number | null = 0;
  private _topOfLeftTemp: number | null = null;
  private _top: number = 0;

  public rangeStart: { left: number, top: number } | null = null;
  public rangeEndsDecoration: { start: Token | null, end: Token | null } | null = null;

  public get left() {
    return this._left;
  }
  public get top() {
    return this._top;
  }
  public get offset() {
    if (this.lines!.lines.length === 1)
      return this._left;
    return this.lines!.lines.slice(0, this._top).reduce((acc, line) => acc + line.length + 1, 0) + this._left;
  }
  public get isRangeSelected() {
    return this.rangeStart !== null;
  }

  public set left(left: number) {
    if (left <= 0) {
      this._left = 0;
    } else {
      if (this.lines!.lines[this._top].length >= left) {
        this._left = left;
      } else {
        this._left = this.lines!.lines[this._top].length;
      }
    }
    this._leftTemp = this._left;
    this._topOfLeftTemp = this._top;
  }
  public set top(top: number) {
    if (top <= 0) {
      this._top = 0;
    } else if (top >= this.lines!.lines.length) {
      this._top = this.lines!.lines.length - 1;
    } else {
      this._top = top;
    }

    if ((this._leftTemp === null)) {
      this._left = this.lines!.lines[this._top].length;
    } else {
      if (this._topOfLeftTemp === null || this._topOfLeftTemp === this._top) {
        this._left = this._leftTemp;
      } else {
        const width = measureTextWidth(this.lines!.lines[this._topOfLeftTemp].text.slice(0, this._leftTemp));
        const text = this.lines!.lines[this._top].text;
        for (let i = 0; i <= this.lines!.lines[this._top].length; i++) {
          const lastCharWidth = measureTextWidth(text.slice(i - 1, i));
          const nextWidth = measureTextWidth(text.slice(0, i));
          if (nextWidth >= width - lastCharWidth / 2) {
            this._left = i;
            return;
          }
        }
        this._left = this.lines!.lines[this._top].length;
      }
    }
  }
  public set(left: number, top: number) {
    this._top = top;
    this.left = left;
    this._leftTemp = left;
    this._topOfLeftTemp = top;
    this.top = top;

    this.move(this._left, this._top);
  }

  public moveWithOffset(offset: number) {
    if (offset < 0) {
      this.left = 0;
      this.top = 0;
    } else {
      while (true) {
        if (this.lines!.lines[this.top].length - offset >= 0) {
          this.left = offset;
          break;
        } else {
          offset -= this.lines!.lines[this.top].length + 1;
          this.top++;
        }
      }

      this.move(this._left, this._top);
    }
    this._leftTemp = this.left;
    this._topOfLeftTemp = this.top;
  }
  public moveLeft() {
    if (this.left === 0) {
      if (this.top === 0)
        return;
      this.top--;
      this.left = this.lines!.lines[this.top].length;
    } else if (this.left > 0) {
      this.left--;
    } else if (this.top > 0) {
      this.top--;
      this.left = this.lines!.lines[this.top].length;
    }
    this._leftTemp = this.left;
    this._topOfLeftTemp = this.top;

    this.move(this._left, this._top);
  }
  public moveRight() {
    if (this.left < this.lines!.lines[this.top].length) {
      this.left++;
    } else if (this.top < this.lines!.lines.length - 1) {
      this.top++;
      this.left = 0;
    }
    this._leftTemp = this.left;
    this._topOfLeftTemp = this.top;

    this.move(this._left, this._top);
  }
  public moveUp() {
    if (this.top > 0) {
      this.top--;
      if (this._left > this.lines!.lines[this.top].length) {
        this._leftTemp = this.left;
        this._topOfLeftTemp = this.top;
      }
    }

    this.move(this._left, this._top);
  }
  public moveDown() {
    if (this.top < this.lines!.lines.length - 1) {
      this.top++;
      if (this._left > this.lines!.lines[this.top].length) {
        this._leftTemp = this.left;
        this._topOfLeftTemp = this.top;
      }
    }

    this.move(this._left, this._top);
  }

  private caretBlinkInterval: number | null = null;
  private caretMovedTime = 0;
  private move(left: number, top: number) {
    const caret = document.getElementById('caret');
    if (caret !== null) {
      document.querySelector('.lineNumber.selected')?.classList.remove('selected');

      const lineNumberElement = document.getElementById('line' + this.lines!.lines[this.top].lineId.toString())!.children[0];
      lineNumberElement.classList.add('selected');

      const styleOfLineNumberElement = getComputedStyle(lineNumberElement);
      const marginLeft = parseFloat(styleOfLineNumberElement.width.replace('px', '')) + parseFloat(styleOfLineNumberElement.paddingRight.replace('px', ''));
      caret.className = '';
      const caretLeft = measureTextWidth(this.lines!.lines[top].text.slice(0, left));
      caret.style.left = `${caretLeft - 1 + marginLeft}px`;
      caret.style.top = `${document.getElementById('line' + this.lines!.lines[top].lineId.toString())?.offsetTop}px`;
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

  public changeSelection(left: number, top: number) {
    this.rangeStart = { left, top };
    const isCaretUpper = this.top < this.rangeStart.top || (this.top === this.rangeStart.top && this.left < this.rangeStart.left);
    const start = isCaretUpper ? { left: this.left, top: this.top } : { left: this.rangeStart.left, top: this.rangeStart.top };
    const end = isCaretUpper ? { left: this.rangeStart.left, top: this.rangeStart.top } : { left: this.left, top: this.top };

    this.clearSelection(false);

    let startLeftAtStartEnd = 0;
    for (let i = start.top; i >= 0; i--) {
      if (this.lines!.lines[i].tokens.length > 0) {
        startLeftAtStartEnd = this.lines!.lines[i].tokens[0].start + start.left;
        break;
      }
    }
    let endLeftAtStartEnd = 0;
    for (let i = end.top; i >= 0; i--) {
      if (this.lines!.lines[i].tokens.length > 0) {
        endLeftAtStartEnd = this.lines!.lines[i].tokens[0].start + end.left;
        break;
      }
    }

    if (start.top === end.top) {
      this.lines!.lines[start.top].tokens.forEach(token => {
        if (token.start >= startLeftAtStartEnd && token.end <= endLeftAtStartEnd) {
          token.element!.classList.add('selection');
        }
      });
    } else {
      const startTokens = this.lines!.lines[start.top].tokens.filter(token => token.start >= startLeftAtStartEnd);
      startTokens.forEach(token => {
        token.element!.classList.add('selection');
      });
      if (startTokens.length > 0)
        startTokens[startTokens.length - 1].element!.classList.add('extensionOfLineBreak');
      else
        createExtensionOfLineBreakForEmptyLine(this.lines!, start.top);

      for (let i = start.top + 1; i <= end.top - 1; i++) {
        for (let j = 0; j < this.lines!.lines[i].tokens.length; j++) {
          this.lines!.lines[i].tokens[j].element!.classList.add('selection');
        }
        if (this.lines!.lines[i].tokens.length > 0)
          this.lines!.lines[i].tokens[this.lines!.lines[i].tokens.length - 1].element!.classList.add('extensionOfLineBreak');
        else
          createExtensionOfLineBreakForEmptyLine(this.lines!, i);
      }

      this.lines!.lines[end.top].tokens.forEach(token => {
        if (token.end <= endLeftAtStartEnd)
          token.element!.classList.add('selection');
      });
    }
    const startIsHead = isHeadOfToken(this.lines!, start.left, start.top, startLeftAtStartEnd);
    const endIsHead = isHeadOfToken(this.lines!, end.left, end.top, endLeftAtStartEnd);
    if (startIsHead === false) {
      const startDecorationToken = createStartDecoration(this.lines!, this.decorationsData, this.rangeEndsDecoration);
      if (endIsHead === false)
        createEndDecoration(this.lines!, this.decorationsData, this.rangeEndsDecoration, startDecorationToken);
    } else if (endIsHead === false) {
      createEndDecoration(this.lines!, this.decorationsData, this.rangeEndsDecoration);
    }

    function createStartDecoration(lines: Lines, decorationsData: DecorationsData, rangeEndsDecoration: { start: Token | null, end: Token | null } | null) {
      const startToken = lines.lines[start.top].tokens.find(token => token.end >= startLeftAtStartEnd)!;
      Decoration.create(decorationsData, startToken, startLeftAtStartEnd - startToken.start, startToken.text.length - (startLeftAtStartEnd - startToken.start), SELECTION_COLOR_ID, 'selection');
      rangeEndsDecoration = { start: startToken, end: null };
      return startToken;
    }
    function createEndDecoration(lines: Lines, decorationsData: DecorationsData, rangeEndsDecoration: { start: Token | null, end: Token | null } | null, startDecorationToken: Token | null = null) {
      const endToken = findLast(lines.lines[end.top].tokens, token => token.start <= endLeftAtStartEnd)!;

      if (endToken === startDecorationToken) {
        const decoration = startDecorationToken.decorations.find(decoration => decoration.type === 'selection')!;
        decoration.length = endLeftAtStartEnd - startDecorationToken.start - decoration.offset;
        return;
      }

      Decoration.create(decorationsData, endToken, 0, endLeftAtStartEnd - endToken.start, SELECTION_COLOR_ID, 'selection');
      if (rangeEndsDecoration === null)
        rangeEndsDecoration = { start: null, end: endToken };
      else
        rangeEndsDecoration.end = endToken;
    }

    function createExtensionOfLineBreakForEmptyLine(lines: Lines, top: number) {
      const element = document.createElement('span');
      element.classList.add('extensionOfLineBreakForEmptyLine');
      document.getElementById('line' + lines.lines[top].lineId.toString())?.appendChild(element);
    }

    function isHeadOfToken(lines: Lines, left: number, top: number, leftAtStartEnd: number) {
      if (left === 0 || lines.lines[top].tokens.length === 0 || left === lines.lines[top].length)
        return true;
      return lines.lines[top].tokens.some(token => token.start === leftAtStartEnd);
    }
  }
  public clearSelection(isClearRangeStart = true) {
    if (this.rangeStart !== null) {
      if (isClearRangeStart)
        this.rangeStart = null;
      document.querySelectorAll('.selection').forEach(element => element.classList.remove('selection'));
      document.querySelectorAll('.extensionOfLineBreak').forEach(element => element.classList.remove('extensionOfLineBreak'));
      document.querySelectorAll('.extensionOfLineBreakForEmptyLine').forEach(element => element.remove());
      this.removeEndsDecoration();
    }
  }

  private removeEndsDecoration() {
    if (this.rangeEndsDecoration !== null) {
      this.rangeEndsDecoration.start?.deleteSelectionDecoration();
      this.rangeEndsDecoration.end?.deleteSelectionDecoration();
      this.rangeEndsDecoration = null;
    }
  }
}

class Lines {
  constructor(private caret: Caret, private tokenId: TokenId, private decorationsData: DecorationsData) { }

  private lastLineId: number = 0;
  lines: Line[] = [];

  public appendLine(text: string = '') {
    const line = new Line(this.caret, this, this.tokenId, this.decorationsData, this.lastLineId++);
    this.lines.push(line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const lineNumber = document.createElement('span');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = this.lines.length.toString();
    newLine.append(lineNumber);
    document.getElementById('editorSpace')?.appendChild(newLine);

    let textIndexOffset: number | undefined = undefined;
    for (let i = this.lines.length - 2; i >= 0; i--) {
      if (this.lines[i].tokens.length > 0) {
        textIndexOffset = this.lines[i].tokens[this.lines[i].tokens.length - 1].end;
        break;
      }
    }
    Line.splitTextAndCreateToken(this, this.tokenId, text, this.lines.length - 1, 0, false, textIndexOffset);

    this.updateLineNumberWidth();
  }
  public insertLine(top: number, text: string = '') {
    const line = new Line(this.caret, this, this.tokenId, this.decorationsData, this.lastLineId++);
    this.lines.splice(top, 0, line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const lineNumber = document.createElement('span');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = (top + 1).toString();
    newLine.append(lineNumber);
    if (top === 0)
      document.getElementById('editorSpace')?.insertBefore(newLine, document.getElementById('editorSpace')?.firstChild!);
    else if (top === this.lines.length - 1)
      document.getElementById('editorSpace')?.appendChild(newLine);
    else
      document.getElementById('editorSpace')?.insertBefore(newLine, document.getElementById('line' + this.lines[top + 1].lineId.toString()));

    let textIndexOffset: number | undefined = undefined;
    for (let i = top - 1; i >= 0; i--) {
      if (this.lines[i].tokens.length > 0) {
        textIndexOffset = this.lines[i].tokens[this.lines[i].tokens.length - 1].end;
        break;
      }
    }
    Line.splitTextAndCreateToken(this, this.tokenId, text, top, 0, false, textIndexOffset);

    this.updateLineNumber(top + 1);
    this.updateLineNumberWidth();
  }
  public deleteLine(top: number, changeStartEnd = true) {
    const length = this.lines[top].length;
    document.getElementById('line' + this.lines[top].lineId.toString())?.remove();

    for (let token of this.lines[top].tokens) {
      token.delete();
    }

    this.lines.splice(top, 1);

    if (changeStartEnd)
      for (let i = top; i < this.lines.length; i++)
        this.lines[i].leftOfTokensOffset -= length;

    this.updateLineNumber(top);
  }
  public swapLine(top: number, length: number, isUp: boolean) {
    if (isUp) {
      if (top === 0)
        return;

      let start = 0;
      for (let i = top - 1; i >= 0; i--) {
        if (this.lines[i].tokens.length > 0) {
          start = this.lines[i].tokens[0].start;
          break;
        }
      }

      const move = document.getElementById('line' + this.lines[top - 1].lineId.toString());
      if (top + length === this.lines.length)
        document.getElementById('editorSpace')?.appendChild(move!);
      else
        document.getElementById('editorSpace')?.insertBefore(move!, document.getElementById('line' + this.lines[top + length].lineId.toString()));
      this.lines.splice(top - 1, 0, ...this.lines.splice(top, length));

      let sumLength = 0;
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < this.lines[top - 1 + i].tokens.length; j++) {
          this.lines[top - 1 + i].tokens[j].start = start + sumLength;
          this.lines[top - 1 + i].tokens[j].end = start + sumLength + this.lines[top - 1 + i].tokens[j].text.length;
          sumLength += this.lines[top - 1 + i].tokens[j].text.length;
        }
      }
      for (let i = 0; i < this.lines[top - 1 + length].tokens.length; i++) {
        this.lines[top - 1 + length].tokens[i].start = start + sumLength;
        this.lines[top - 1 + length].tokens[i].end = start + sumLength + this.lines[top - 1 + length].tokens[i].text.length;
        sumLength += this.lines[top - 1 + length].tokens[i].text.length;
      }
    } else {
      if (top + length === this.lines.length)
        return;

      let start = 0;
      for (let i = top; i >= 0; i--) {
        if (this.lines[i].tokens.length > 0) {
          start = this.lines[i].tokens[0].start;
          break;
        }
      }

      const move = document.getElementById('line' + this.lines[top + length].lineId.toString());
      document.getElementById('editorSpace')?.insertBefore(move!, document.getElementById('line' + this.lines[top].lineId.toString()));
      this.lines.splice(top + 1, 0, ...this.lines.splice(top, length));

      let sumLength = 0;
      for (let i = 0; i < this.lines[top].tokens.length; i++) {
        this.lines[top].tokens[i].moveLineInfo(top);
        this.lines[top].tokens[i].start = start + sumLength;
        this.lines[top].tokens[i].end = start + sumLength + this.lines[top].tokens[i].text.length;
        sumLength += this.lines[top].tokens[i].text.length;
      }
      for (let i = 0; i < length; i++) {
        for (let j = 0; j < this.lines[top + 1 + i].tokens.length; j++) {
          this.lines[top + 1 + i].tokens[j].moveLineInfo(top + 1);
          this.lines[top + 1 + i].tokens[j].start = start + sumLength;
          this.lines[top + 1 + i].tokens[j].end = start + sumLength + this.lines[top + 1 + i].tokens[j].text.length;
          sumLength += this.lines[top + 1 + i].tokens[j].text.length;
        }
      }
    }

    this.updateLineNumber(isUp ? top - 1 : top);
  }

  public deleteRange(first: { left: number, top: number }, second: { left: number, top: number }) {
    const start = first.top < second.top ? first : (first.top === second.top && first.left < second.left ? first : second);
    const end = first.top < second.top ? second : (first.top === second.top && first.left < second.left ? second : first);
    if (start.top === end.top) {
      this.lines[start.top].deleteText(start.left, end.left - start.left);
    } else {
      const caretLeft = start.left;
      const caretTop = start.top;

      const remainText = this.lines[start.top].text.slice(0, start.left) + this.lines[end.top].text.slice(end.left);

      this.insertLine(start.top, remainText);

      for (let i = 0; i < this.lines[start.top + 1].tokens.length; i++) {
        for (let j = 0; j < this.lines[start.top + 1].tokens[i].decorations.length; j++) {
          const decoration = this.lines[start.top + 1].tokens[i].decorations[j];
          let startLeft = this.lines[start.top + 1].tokens[i].start - this.lines[start.top + 1].tokens[0].start + decoration.offset;
          let endLeft = startLeft + decoration.length;
          if (startLeft !== endLeft) {
            if (endLeft > start.left)
              endLeft = start.left;
            Decorations.create(this, this.decorationsData, startLeft, start.top, endLeft - startLeft, decoration.colorId, decoration.type);
          }
        }
      }
      for (let i = 0; i < this.lines[end.top + 1].tokens.length; i++) {
        for (let j = 0; j < this.lines[end.top + 1].tokens[i].decorations.length; j++) {
          const decoration = this.lines[end.top + 1].tokens[i].decorations[j];
          let startLeft = this.lines[end.top + 1].tokens[i].start - this.lines[end.top + 1].tokens[0].start + decoration.offset - (end.left - start.left);
          let endLeft = startLeft + decoration.length;

          if (startLeft !== endLeft) {
            if (startLeft < 0)
              startLeft = 0;
            Decorations.create(this, this.decorationsData, startLeft, start.top, endLeft - startLeft, decoration.colorId, decoration.type);
          }
        }
      }

      for (let i = end.top + 1; i >= start.top + 1; i--) {
        this.deleteLine(i);
      }

      for (let i = start.top + 1; i < this.lines.length; i++) {
        this.lines[i].leftOfTokensOffset += remainText.length;
      }

      this.caret.set(caretLeft, caretTop);
    }

    this.updateLineNumber(start.top);
    this.updateLineNumberWidth();
  }

  private updateLineNumber(top: number) {
    for (let i = top; i < this.lines.length; i++)
      document.getElementById('line' + this.lines[i].lineId.toString())!.children[0].textContent = (i + 1).toString();
  }
  private lineNumberWidth = 4;
  private updateLineNumberWidth() {
    const textLength = this.lines.length.toString().length;
    let lineNumberWidth = textLength <= 4 ? 4 : textLength;
    if (lineNumberWidth !== this.lineNumberWidth) {
      this.lineNumberWidth = lineNumberWidth;
      document.documentElement.style.setProperty('--line-number-width', `${lineNumberWidth}ch`);
      this.caret.set(this.caret.left, this.caret.top);
    }
  }
}

class Line {
  private static separateByKeyword = /[\w\p{sc=Hiragana}\r{sc=Katakana}\p{sc=Han}、。￥・！”＃＄％＆’（）＊＋，．ー／：；＜＝＞？＠＿‘＾｜～「」｛｝［］【】≪≫《》〈〉〔〕]+|\r\n|\r|\n|([^\S\r\n]+)|==|!==|<=|>=|&&|\|\||=>|\+\+|--|\+=|-=|\*=|\/=|%=|\?\.|!\.|\?\?|\?\?=|>>>|<<|>>|<<=|>>=|>>>=|&=|\^=|\|=|::|\.\.|->|\W/gu;
  private static commentRegex = /(?:(\/\/.*?)(?:\r\n|\r|\n))|(\/\/.*?$)|(\/\*.*?\*\/)/yms;
  private static stringLiteralRegex = /(?:(\$@"|@\$"|@\"|@")((?:(?:[^\+\r\n,;]*?)(?:"")*)*)(?:(?:,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>)|(")))|(?:((?<!@)\$?)(")((?:[^"\\]|\\.)*?)(?:(?:(?<!\\)(\\\\)*[;,]|(?= *?(?:\r\n|\r|\n|$|\+|==|!=|<=|>=|=>)))|(?<!\\)(\\\\)*(")))/y;
  private static rawStringLiteralRegex = /(?<!@)(?<!\$)(\$+?@?|@?\$+?)?(`.*?(?<!\\)`|(?<quote>"{3,}).*?\k<quote>(?!\"))/yms;
  private static charLiteralRegex = /(')([^ \r\n]+?)(?:(')|(?: |,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>))/y;
  // 厳密な判定を行うなら↓
  // private charLiteralRegex = /(')(?:(\\x[0-9A-Fa-f]{1,4})|(\\u[0-9A-Fa-f]{4})|(\\U[0-9A-Fa-f]{8})|(\\['"\\0abefnrtv]))(?:(')|(?: |,|;|\r\n|\r|\n|$|\+|==|!=|<=|>=|=>))/g;

  public constructor(private caret: Caret, private lines: Lines, private tokenId: TokenId, private decorationsData: DecorationsData, lineId: number, tokens?: Token[]) {
    this.lines = lines;
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
  public static splitTextAndCreateToken(lines: Lines, tokenId: TokenId, text: string, top: number, insertIndex: number, appendToLineLater = false, textIndexOffset = 0) {
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
    while ((match = Line.separateByKeyword.exec(text)) != null) {
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
      this.commentRegex.lastIndex = i;
      this.stringLiteralRegex.lastIndex = i;
      this.rawStringLiteralRegex.lastIndex = i;
      this.charLiteralRegex.lastIndex = i;

      let commentPosition = findComment(this.commentRegex, text);
      let stringLiteralPosition = findStringLiteral(this.stringLiteralRegex, text);
      let rawStringLiteralPosition = findRawStringLiteral(this.rawStringLiteralRegex, text);
      let charLiteralPosition = findCharLiteral(this.charLiteralRegex, text);

      if (commentPosition != null && (stringLiteralPosition == null || commentPosition.start < stringLiteralPosition.start) && (rawStringLiteralPosition == null || commentPosition.start < rawStringLiteralPosition.start) && (charLiteralPosition == null || commentPosition.start < charLiteralPosition.start)) {
        result.push(Token.create(
          lines,
          tokenId,
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
          lines,
          tokenId,
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
          lines,
          tokenId,
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
          lines,
          tokenId,
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
            lines,
            tokenId,
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

    const top = this.lines.lines.indexOf(this);

    if (this.tokens.length === 0) {
      let textIndexOffset = 0;
      if (top !== 0) {
        for (let i = top - 1; i >= 0; i--) {
          if (this.lines.lines[i].tokens.length > 0) {
            textIndexOffset = this.lines.lines[i].tokens[this.lines.lines[i].tokens.length - 1].end;
            break;
          }
        }
      }
      Line.splitTextAndCreateToken(this.lines, this.tokenId, text, top, 0, false, textIndexOffset);

      for (let i = top + 1; i < this.lines.lines.length; i++) {
        this.lines.lines[i].leftOfTokensOffset += text.length;
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
    const oldDecorations = this.tokens.slice(resplitStartIndex, resplitEndIndex + 1).flatMap(token => token.decorations.map(decoration => [decoration.offset, decoration.length, decoration.colorId, decoration.type, token.start] as [number, number, string, 'selection' | undefined, number]));

    newTokens.push(...this.tokens.slice(0, resplitStartIndex));

    insertedText ??= this.text.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + text + this.text.slice(left, this.tokens[resplitEndIndex].end - this.tokens[0].start);
    for (let i = resplitStartIndex; i <= resplitEndIndex; i++) {
      this.tokens[i].delete();
    }
    const resplit = Line.splitTextAndCreateToken(this.lines, this.tokenId, insertedText, top, 0, true, this.tokens[resplitStartIndex].start);
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

    for (let i = top + 1; i < this.lines.lines.length; i++) {
      this.lines.lines[i].leftOfTokensOffset += text.length;
    }

    this._tokens = newTokens;

    for (let decoration of oldDecorations) {
      let start = decoration[4] - startOfFirstTokenAtLine + decoration[0];
      let end = start + decoration[1];
      if (start >= left)
        start += text.length;
      if (end >= left)
        end += text.length;

      if (start !== end) {
        Decorations.create(this.lines, this.decorationsData, start, top, end - start, decoration[2], decoration[3]);
      }
    }
  }

  public deleteText(left: number, length: number) {
    if (left === -1) {
      const top = this.lines.lines.indexOf(this);
      if (top === 0 || length !== 1)
        return;

      const previousLine = this.lines.lines[top - 1];
      if (previousLine.tokens.length === 0) {
        if (this.tokens.length !== 0)
          this.moveTokens(0, this.tokens.length - 1, 0, top - 1, false);
      } else if (this.tokens.length !== 0) {
        const previousLineLength = previousLine.length;
        const lastTokenIndex = previousLine.tokens.length - 1;
        const lastToken = previousLine.tokens[lastTokenIndex];
        const firstToken = this.tokens[0];
        const text = lastToken.text + firstToken.text;

        const decorationsOfLastToken = previousLine.tokens[lastTokenIndex].decorations.map(decoration => ({ offset: decoration.offset, length: decoration.length, colorId: decoration.colorId, type: decoration.type }));

        previousLine.deleteToken(lastToken.tokenId);
        Line.splitTextAndCreateToken(this.lines, this.tokenId, text, top - 1, previousLine.tokens.length, false, lastToken.start);
        for (let i = 1; i < this.tokens.length; i++) {
          this.tokens[i].start += this.leftOfTokensOffset - this.lines.lines[top - 1].leftOfTokensOffset;
          this.tokens[i].end += this.leftOfTokensOffset - this.lines.lines[top - 1].leftOfTokensOffset;
        }
        this.moveTokens(1, this.tokens.length - 1, previousLine.tokens.length, top - 1, false);

        for (let i = 0; i < decorationsOfLastToken.length; i++) {
          const decoration = decorationsOfLastToken[i];
          Decorations.create(this.lines, this.decorationsData, decoration.offset + previousLine.tokens[lastTokenIndex].start - previousLine.tokens[0].start, top - 1, decoration.length, decoration.colorId, decoration.type);
        }
        for (let i = 0; i < this.tokens[0].decorations.length; i++) {
          const decoration = this.tokens[0].decorations[i];
          Decorations.create(this.lines, this.decorationsData, decoration.offset + previousLineLength, top - 1, decoration.length, decoration.colorId, decoration.type);
        }
      }
      this.lines.deleteLine(top, false);
      return;
    }

    if (left < 0 || length <= 0)
      return;

    const top = this.lines.lines.indexOf(this);

    if (left === this.length && length === 1) {
      if (top === this.lines.lines.length - 1)
        return;

      const nextLine = this.lines.lines[top + 1];
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
        Line.splitTextAndCreateToken(this.lines, this.tokenId, text, top, this.tokens.length, false, lastToken.start);
        for (let i = 1; i < nextLine.tokens.length; i++) {
          nextLine.tokens[i].start += nextLine.leftOfTokensOffset - this.leftOfTokensOffset;
          nextLine.tokens[i].end += nextLine.leftOfTokensOffset - this.leftOfTokensOffset;
        }
        nextLine.moveTokens(1, nextLine.tokens.length - 1, this.tokens.length, top, false);

        for (let i = 0; i < decorationsOfLastToken.length; i++) {
          const decoration = decorationsOfLastToken[i];
          Decorations.create(this.lines, this.decorationsData, decoration.offset + this.tokens[lastTokenIndex].start - this.tokens[0].start, top, decoration.length, decoration.colorId, decoration.type);
        }
        for (let i = 0; i < nextLine.tokens[0].decorations.length; i++) {
          const decoration = nextLine.tokens[0].decorations[i];
          Decorations.create(this.lines, this.decorationsData, decoration.offset + previousLineLength, top, decoration.length, decoration.colorId, decoration.type);
        }
      }
      this.lines.deleteLine(top + 1, false);
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
    const oldDecorations = this.tokens.slice(resplitStartIndex, resplitEndIndex + 1).flatMap(token => token.decorations.map(decoration => [decoration.offset, decoration.length, decoration.colorId, decoration.type, token.start] as [number, number, string, 'selection' | undefined, number]));

    const deletedText = this.text.slice(this.tokens[resplitStartIndex].start - this.tokens[0].start, left) + this.text.slice(left + length, this.tokens[resplitEndIndex].end - this.tokens[0].start);
    for (let i = resplitStartIndex; i <= resplitEndIndex; i++) {
      this.tokens[i].delete();
    }
    const resplit = Line.splitTextAndCreateToken(this.lines, this.tokenId, deletedText, top, 0, true, this.tokens[resplitStartIndex].start);
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

    for (let i = top + 1; i < this.lines.lines.length; i++) {
      this.lines.lines[i].leftOfTokensOffset -= length;
    }

    this._tokens = newTokens;

    const newTextLength = this.text.length;
    for (let decoration of oldDecorations) {
      let start = decoration[4] - startOfFirstTokenAtLine + decoration[0];
      let end = start + decoration[1];
      if (start >= left + length)
        start -= length;
      if (end >= left + length)
        end -= length;

      if (start !== end && start < newTextLength) {
        if (end > newTextLength)
          end = newTextLength;
        Decorations.create(this.lines, this.decorationsData, start, top, end - start, decoration[2], decoration[3]);
      }
    }
  }

  private isHeadOfToken(left: number, leftAtStartEnd: number) {
    if (left === 0 || this.tokens.length === 0 || left === this.length)
      return true;
    return this.tokens.some(token => token.start === leftAtStartEnd);
  }

  public moveTokens(fromStartIndex: number, fromEndIndex: number, toIndex: number, toTop: number, changeStartEnd = true) {
    const top = this.lines.lines.indexOf(this);
    if (top === toTop)
      return;

    const originalToIndex = toIndex;
    const lineElement = document.getElementById(`line${this.lines.lines[toTop].lineId}`);
    if (lineElement === null)
      return;
    const isInsertAtEnd = toIndex === this.lines.lines[toTop].tokens.length;

    let leftAtStartEnd: number = 0;
    if (this.lines.lines[toTop].tokens.length > 0 && this.lines.lines[toTop].tokens[toIndex]) {
      leftAtStartEnd = this.lines.lines[toTop].tokens[toIndex].start;
    } else {
      for (let i = toTop; i >= 0; i--) {
        if (this.lines.lines[i].tokens.length > 0) {
          leftAtStartEnd = this.lines.lines[i].tokens[this.lines.lines[i].tokens.length - 1].end + this.lines.lines[toTop].tokens.slice(0, toIndex).reduce((acc, token) => acc + token.text.length, 0);
          break;
        }
      }
    }

    let length = 0;
    for (let token of this.tokens.slice(fromStartIndex, fromEndIndex + 1)) {
      token.moveLineInfo(toTop);
      this.lines.lines[toTop].tokens.splice(toIndex++, 0, token);
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
      for (let i = toIndex + fromEndIndex - fromStartIndex; i < this.lines.lines[toTop].tokens.length; i++) {
        this.lines.lines[toTop].tokens[i].start += length;
        this.lines.lines[toTop].tokens[i].end += length;
      }

      for (let i = fromStartIndex; i < this.tokens.length; i++) {
        this.tokens[i].start -= length;
        this.tokens[i].end -= length;
      }

      if (top > toTop) {
        for (let i = toTop + 1; i <= top; i++) {
          this.lines.lines[i].leftOfTokensOffset += length;
        }
      } else {
        for (let i = top; i < toTop; i++) {
          this.lines.lines[i].leftOfTokensOffset -= length;
        }
      }
    }
  }

  public startNewLine(left: number) {
    const top = this.lines.lines.indexOf(this);
    if (left === 0) {
      this.lines.insertLine(top + 1);
      if (this.tokens.length !== 0)
        this.moveTokens(0, this.tokens.length - 1, 0, top + 1, false);
      this.caret.set(0, top + 1);
      return;
    } else if (left === this.length) {
      this.lines.insertLine(top + 1);
      this.caret.set(0, top + 1);
      return;
    }

    const tokenFromLeft = this.getTokenFromLeft(left);
    if (tokenFromLeft === null)
      return;
    if (tokenFromLeft.isHeadOfToken) {
      this.lines.insertLine(top + 1);
      this.moveTokens(tokenFromLeft.index, this.tokens.length - 1, 0, top + 1, false);
    } else {
      const target = this.tokens[tokenFromLeft.index];

      let targetInNextLineText: string;
      if (this.tokens.length === tokenFromLeft.index + 1) {
        targetInNextLineText = target.text.slice(left - tokenFromLeft.leftOfTokenAtLine);

        const targetInThisLineText = target.text.slice(0, left - tokenFromLeft.leftOfTokenAtLine);
        const targetStart = target.start;
        this.deleteToken(target.tokenId);

        Line.splitTextAndCreateToken(this.lines, this.tokenId, targetInThisLineText, top, tokenFromLeft.index, false, targetStart);

        this.lines.insertLine(top + 1, targetInNextLineText);
      } else {
        targetInNextLineText = target.text.slice(left - tokenFromLeft.leftOfTokenAtLine) + this.tokens[tokenFromLeft.index + 1].text;

        const afterDeleteTokenId = this.tokens[tokenFromLeft.index + 1].tokenId;

        this.lines.insertLine(top + 1, targetInNextLineText);

        const targetInThisLineText = target.text.slice(0, left - tokenFromLeft.leftOfTokenAtLine);

        let leftAtStartEnd = 0;
        for (let i = top; i >= 0; i--) {
          if (this.lines.lines[i].tokens.length > 0) {
            leftAtStartEnd = this.lines.lines[i].tokens[0].start + left;
            break;
          }
        }

        this.moveTokens(tokenFromLeft.index + 2, this.tokens.length - 1, this.lines.lines[top + 1].tokens.length, top + 1, false);

        Line.splitTextAndCreateToken(this.lines, this.tokenId, targetInThisLineText, top, tokenFromLeft.index, false, target.start);

        this.deleteToken(afterDeleteTokenId);
        this.deleteToken(target.tokenId);

        let length = 0;
        for (let i = 0; i < this.lines.lines[top + 1].tokens.length; i++) {
          this.lines.lines[top + 1].tokens[i].start = leftAtStartEnd - left + this.length + length;
          this.lines.lines[top + 1].tokens[i].end = leftAtStartEnd - left + this.length + length + this.lines.lines[top + 1].tokens[i].text.length;
          length += this.lines.lines[top + 1].tokens[i].text.length;
        }
      }
    }
    this.caret.set(0, top + 1);
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
class TokenId {
  public lastTokenId: number = 0;
}
class Token extends EventEmitter {
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

  private constructor(private lines: Lines, tokenId: number, element: HTMLSpanElement | undefined, text: string, start: number, end: number, category: Category, kind: Kind | undefined, decorations: Decoration[] | undefined, line: Line) {
    super();

    this.tokenId = tokenId;
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
  public static create(lines: Lines, tokens: TokenId, top: number, insertIndex: number | null, text: string, start: number, end: number, category: Category, kind: Kind | undefined, decorations?: Decoration[], appendToLineLater = false): { token: Token, element: HTMLSpanElement, appendToLineFunc?: () => void } {
    const tokenId = tokens.lastTokenId++;
    const element = document.createElement('span');
    element.id = `token${tokenId}`;
    element.classList.add('token');
    const textElement = document.createElement('span');
    textElement.textContent = text;
    element.appendChild(textElement);

    const token = new Token(lines, tokenId, element, text, start - lines.lines[top].leftOfTokensOffset, end - lines.lines[top].leftOfTokensOffset, category, kind, decorations, lines.lines[top]);
    const tokenIdAtInsertIndex = insertIndex === null || lines.lines[top].tokens.length <= insertIndex ? null : lines.lines[top].tokens[insertIndex].tokenId;

    if (appendToLineLater) {
      if (tokenIdAtInsertIndex === null)
        return {
          token,
          element,
          appendToLineFunc: () => {
            lines.lines[top].tokens.push(token);
            document.getElementById(`line${lines.lines[top].lineId}`)?.appendChild(element);
          }
        };
      else
        return {
          token,
          element,
          appendToLineFunc: () => {
            lines.lines[top].tokens.splice(insertIndex!, 0, token);
            document.getElementById(`line${lines.lines[top].lineId}`)?.insertBefore(element, document.getElementById(`token${tokenIdAtInsertIndex}`)!);
          }
        };
    } else {
      lines.lines[top].tokens.splice(insertIndex === null ? lines.lines[top].tokens.length : insertIndex, 0, token);
      if (tokenIdAtInsertIndex === null)
        document.getElementById(`line${lines.lines[top].lineId}`)?.appendChild(element);
      else
        document.getElementById(`line${lines.lines[top].lineId}`)?.insertBefore(element, document.getElementById(`token${tokenIdAtInsertIndex}`)!);
      return { token, element };
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
    this.line = this.lines.lines[top];
  }
}

interface Color {
  id: string;
  color: string;
}
class DecorationsData {
  lastDecorationId = 0;
  colors: Color[] = [];
  backgroundColors: Color[] = [{ id: SELECTION_COLOR_ID, color: '#46f9ff55' }];
}

class Decorations {
  public static create(lines: Lines, decorationsData: DecorationsData, left: number, top: number, length: number, colorId: string, type?: 'selection') {
    if (lines.lines[top].tokens.length === 0 || length <= 0)
      return;

    const leftAtStartEnd = left + lines.lines[top].tokens[0].start;

    const firstTokenIndex = lines.lines[top].tokens.findIndex(token => token.end > leftAtStartEnd);
    if (firstTokenIndex === -1)
      return;
    let lastTokenIndex = findLastIndex(lines.lines[top].tokens, token => token.start < leftAtStartEnd + length);
    const decorations: Decoration[] = [];
    if (lastTokenIndex === -1) {
      lastTokenIndex = lines.lines[top].tokens.length - 1;
    }

    if (firstTokenIndex === lastTokenIndex) {
      decorations.push(Decoration.create(decorationsData, lines.lines[top].tokens[firstTokenIndex], leftAtStartEnd - lines.lines[top].tokens[firstTokenIndex].start, length, colorId, type).decoration);
    } else {
      decorations.push(Decoration.create(decorationsData, lines.lines[top].tokens[firstTokenIndex], leftAtStartEnd - lines.lines[top].tokens[firstTokenIndex].start, lines.lines[top].tokens[firstTokenIndex].text.length - (leftAtStartEnd - lines.lines[top].tokens[firstTokenIndex].start), colorId, type).decoration);
      for (let i = firstTokenIndex + 1; i < lastTokenIndex; i++)
        decorations.push(Decoration.create(decorationsData, lines.lines[top].tokens[i], 0, lines.lines[top].tokens[i].text.length, colorId, type).decoration);
      decorations.push(Decoration.create(decorationsData, lines.lines[top].tokens[lastTokenIndex], 0, leftAtStartEnd + length - lines.lines[top].tokens[lastTokenIndex].start, colorId, type).decoration);
    }
  }
}
class Decoration {
  private readonly decorationsData: DecorationsData;

  public readonly decorationId: number;
  public readonly element: HTMLSpanElement;
  private _token: Token | undefined;
  private _offset: number;
  private _length: number;
  private _colorId: string;
  public type: 'selection' | undefined;

  private constructor(decorationsData: DecorationsData, decorationId: number, element: HTMLSpanElement, token: Token, offset: number, length: number, colorId: string, type?: 'selection') {
    this.decorationsData = decorationsData;
    this.decorationId = decorationId;
    this.element = element;
    this.token = token;
    this._offset = offset;
    this._length = length;
    this._colorId = colorId;
    this.type = type;
  }

  public static create(decorationsData: DecorationsData, token: Token, offset: number, length: number, colorId: string, type: 'selection' | undefined, extensionOfLineBreak = false): { decoration: Decoration, element: HTMLSpanElement } {
    if (token.element === undefined)
      throw new UnhandledError();

    let decorationId: number;
    let element: HTMLSpanElement;
    let existingDecoration: Element | null = null;
    let createdNewElement = false;
    if (type === 'selection' && ((existingDecoration = token.element.querySelector('.selection')), existingDecoration !== null)) {
      element = existingDecoration as HTMLSpanElement;
      decorationId = parseInt(element.id.replace('decoration', ''));
    } else {
      createdNewElement = true;
      element = document.createElement('span');
      decorationId = decorationsData.lastDecorationId++;
      element.id = `decoration${decorationId}`;
      element.classList.add('decoration');
      if (type === 'selection')
        element.classList.add('selection');
      element.style.background = decorationsData.backgroundColors.find(color => color.id === colorId)?.color ?? '';
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

    const decoration = new Decoration(decorationsData, decorationId, element, token, offset, length, colorId, type);

    token.decorations.push(decoration);
    return { decoration, element };
  }

  public delete() {
    this.element.remove();
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
    this.element.style.background = this.decorationsData.backgroundColors.find(color => color.id === colorId)?.color ?? '';
  }

  public changeOffsetAndLength(offset: number, length: number) {
    this._offset = offset;
    this._length = length;
    if (this.token.element !== undefined) {
      this.element.style.left = `${measureTextWidth(this.token.text.slice(0, offset))}px`;
      this.element.style.width = `${measureTextWidth(this.token.text.slice(offset, offset + length))}px`;
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


function calculateMousePosition(lines: Lines, e: MouseEvent): null | { left: number, top: number } {
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

  if (top >= lines.lines.length) {
    return { left: lines.lines[lines.lines.length - 1].length, top: lines.lines.length - 1 };
  } else {
    const text = lines.lines[top].text;
    const length = lines.lines[top].length;

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

function findComment(regex: RegExp, str: string) {
  const captures = regex.exec(str);
  if (captures == null) return null;
  const length = captures.slice(1).reduce((a, b) => a + (b ? b.length : 0), 0)
  return {
    text: str.slice(captures.index, captures.index + length),
    start: captures.index,
    end: captures.index + length,
    isBlock: captures[3] !== undefined
  };
}
function findStringLiteral(regex: RegExp, str: string) {
  const captures = regex.exec(str);
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
function findRawStringLiteral(regex: RegExp, str: string) {
  const captures = regex.exec(str);
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
function findCharLiteral(regex: RegExp, str: string) {
  const captures = regex.exec(str);
  if (captures == null) return null;
  let text = captures[2];
  return {
    text: "'" + text + (captures[3] ? "'" : ''),
    start: captures.index,
    end: captures.index + text.length + (captures[3] === undefined ? 1 : 2),
    data: "'" + text + "'",
  };
}


function repeatAction(repeatActionTimeout: number | null, repeatActionInterval: number | null, action: () => void, intervalToRepeat: number = 750, intervalBetweenActions: number = 100) {
  stopRepeatAction(repeatActionTimeout, repeatActionInterval);
  action();
  repeatActionTimeout = setTimeout(() => {
    repeatActionInterval = setInterval(action, intervalBetweenActions);
  }, intervalToRepeat);
}
function stopRepeatAction(repeatActionTimeout: number | null, repeatActionInterval: number | null) {
  if (repeatActionTimeout !== null) {
    clearTimeout(repeatActionTimeout);
    repeatActionTimeout = null;
  }
  if (repeatActionInterval !== null) {
    clearInterval(repeatActionInterval);
    repeatActionInterval = null;
  }
}

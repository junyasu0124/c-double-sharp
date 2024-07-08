const DEFAULT_KIND = { name: 'text', colorId: 'black' };
const SELECTION_COLOR_ID = 'selection';

document.addEventListener('DOMContentLoaded', () => {  
  Colors.colors.push({ id: 'black', color: '#000000' });
  BackgroundColors.colors.push({ id: 'red', color: '#ff0000aa' });
  Lines.appendLine([new Token('', DEFAULT_KIND)]);
  Caret.set(0, 0);

  Lines.appendLine([
    new Token('Hello,', DEFAULT_KIND),
    new Token(' ', DEFAULT_KIND),
    new Token('World!', DEFAULT_KIND),
  ]);
  Lines.appendLine([new Token('こんにちは, ', DEFAULT_KIND), new Token('世界！', DEFAULT_KIND)]);
  Lines.lines[1].decorations.push(Decorations.createDecoration(0, 1, 5, 'red'));

  let isLatestCopyNotSelected: false | string = false;
  const splitByLineBreak = /\r\n|\r|\n/;
  document.onkeydown = async (e) => {
    if (e.isComposing || e.keyCode === 243 || e.keyCode === 244) {
      return;
    }

    if (e.key === 'F5' || e.key === 'F12')
      return;

    e.preventDefault();

    if (!e.metaKey) {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          repeatAction(async () => {
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
                await Caret.changeSelection(left, top);
              else
                Caret.clearSelection();
            }
          });
          return;
        case 'ArrowUp':
        case 'ArrowDown':
          repeatAction(async () => {
            if (e.altKey) {
              if (Caret.rangeStart !== null) {
                const start = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? Caret.rangeStart : { left: Caret.left, top: Caret.top };
                const end = Caret.rangeStart.top < Caret.top || (Caret.rangeStart.top === Caret.top && Caret.rangeStart.left < Caret.left) ? { left: Caret.left, top: Caret.top } : Caret.rangeStart;
                if (start.top !== end.top) {
                  Lines.swapLine(start.top, end.top - start.top + 1, e.key === 'ArrowUp');
                  Caret.set(Caret.left, Caret.top + (e.key === 'ArrowUp' ? -1 : 1));
                  await Caret.changeSelection(Caret.rangeStart.left, Caret.rangeStart.top + (e.key === 'ArrowUp' ? -1 : 1));
                  return;
                }
              }
              Lines.swapLine(Caret.top, 1, e.key === 'ArrowUp');
              Caret.set(Caret.left, Caret.top + (e.key === 'ArrowUp' ? -1 : 1));
            } else {
              const left = Caret.rangeStart === null ? Caret.left : Caret.rangeStart.left;
              const top = Caret.rangeStart === null ? Caret.top : Caret.rangeStart.top;
              if (e.key === 'ArrowUp')
                Caret.moveUp();
              else
                Caret.moveDown();
              if (e.shiftKey)
                await Caret.changeSelection(left, top);
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
            Lines.lines[topTemp].deleteText(leftTemp - 1, topTemp, 1);
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
              Lines.lines[Caret.top].deleteText(Caret.left, Caret.top, 1);
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
        Lines.lines[start.top].insertText(e.key, start.left, start.top);
        Caret.set(start.left + 1, start.top);
      } else {
        Lines.lines[Caret.top].insertText(e.key, Caret.left, Caret.top);
        Caret.moveRight();
      }
    } else if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      if (e.key === 'v') {
        navigator.clipboard.readText().then(async text => {
          if (text === '')
            return;

          if (text === isLatestCopyNotSelected) {
            const lengthTemp = Lines.lines[Caret.top].length;
            Lines.lines[Caret.top].insertText(text.slice(0, -2), 0, Caret.top);
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
            Lines.lines[Caret.top].insertText(text, Caret.left, Caret.top);
            Caret.set(Caret.left + text.length, Caret.top);
          } else {
            let left = Caret.left;
            let top = Caret.top;
            for (let i = 0; i < split.length; i++) {
              const line = split[i];
              Lines.lines[top].insertText(line, left, top);
              left += line.length;
              if (i !== split.length - 1) {
                Lines.lines[top].startNewLine(left);
                left = 0;
                top++;
              }
            }
            Caret.set(left, top);
          }

          dialog?.hide();
        });
      } else if (e.key === 'c') {
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
        } else {
          text = Lines.lines[Caret.top].text + '\r\n';
          isLatestCopyNotSelected = text;
        }
        navigator.clipboard.writeText(text);
      } else if (e.key === 'a') {
        window.requestAnimationFrame(async () => {
          const date = new Date();
          Caret.set(0, 0);
          await Caret.changeSelection(Lines.lines[Lines.lines.length - 1].length, Lines.lines.length - 1);
          Caret.rangeStart = { left: 0, top: 0 };
          Caret.set(Lines.lines[Lines.lines.length - 1].length, Lines.lines.length - 1);
          console.log(Date.now() - date.getTime());
        });
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
  document.onmousedown = async (e) => {
    const position = calculateMousePosition(e);
    if (position === null)
      return;
    if (e.shiftKey) {
      const left = Caret.rangeStart === null ? Caret.left : Caret.rangeStart.left;
      const top = Caret.rangeStart === null ? Caret.top : Caret.rangeStart.top;
      Caret.set(position.left, position.top);
      await Caret.changeSelection(left, top);
    } else {
      Caret.clearSelection();
      Caret.set(position.left, position.top);
      isMouseDown = true;
    }
  };
  document.onmousemove = (e) => {
    if (isMouseDown === false) return;

    debounce(async (e: MouseEvent) => {
      const position = calculateMousePosition(e);
      if (position === null)
        return;
      if (Caret.left !== position.left || Caret.top !== position.top) {
        const left = Caret.rangeStart === null ? Caret.left : Caret.rangeStart.left;
        const top = Caret.rangeStart === null ? Caret.top : Caret.rangeStart.top;
        Caret.set(position.left, position.top);
        await Caret.changeSelection(left, top);
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

  public static offsetToLeftAndTop(offset: number): { left: number, top: number } {
    let top = 0;
    let left = 0;
    while (true) {
      if (Lines.lines[top].length - offset >= 0) {
        left = offset;
        break;
      } else {
        offset -= Lines.lines[top].length + 1;
        top++;
      }
    }
    return { left, top };
  }
  public static leftAndTopToOffset(left: number, top: number): number {
    if (Lines.lines.length === 1)
      return left;
    return Lines.lines.slice(0, top).reduce((acc, line) => acc + line.length + 1, 0) + left;
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
      const marginLeft = parseFloat(getComputedStyle(document.querySelector('.decorations:has(*)')!).marginLeft!.replace('px', ''));
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

  public static async changeSelection(left: number, top: number) {
    this.rangeStart = { left, top };
    const isCaretUpper = this.top < this.rangeStart.top || (this.top === this.rangeStart.top && this.left < this.rangeStart.left);
    const start = isCaretUpper ? { left: this.left, top: this.top } : { left: this.rangeStart.left, top: this.rangeStart.top };
    const end = isCaretUpper ? { left: this.rangeStart.left, top: this.rangeStart.top } : { left: this.left, top: this.top };
    if (start.top === end.top) {
      for (let i = 0; i < Lines.lines.length; i++)
        deleteSelectionDecoration(i);
      setSelectionDecoration(start.left, start.top, end.left - start.left, SELECTION_COLOR_ID, false);
    } else {
      let dialog: Dialog | null = null;
      if (end.top - start.top > 75) {
        dialog = new Dialog('選択中', 'テキストを選択中です。しばらくお待ちください。', []);
        await dialog.show();
      }

      for (let i = 0; i < start.top; i++)
        deleteSelectionDecoration(i);
      setSelectionDecoration(start.left, start.top, Lines.lines[start.top].length - start.left, SELECTION_COLOR_ID, true);
      for (let i = start.top + 1; i <= end.top - 1; i++) {
        setSelectionDecoration(0, i, Lines.lines[i].length, SELECTION_COLOR_ID, true);
      }
      setSelectionDecoration(0, end.top, end.left, SELECTION_COLOR_ID, false);
      for (let i = end.top + 1; i < Lines.lines.length; i++)
        deleteSelectionDecoration(i);

      dialog?.hide();
    }

    function setSelectionDecoration(left: number, top: number, length: number, colorId: string, lineBreak: boolean) {
      const decoration = Lines.lines[top].decorations.find(decoration => decoration.type === 'selection');
      if (decoration !== undefined) {
        decoration.changeLeftAndWidth(left, length, lineBreak);
      } else {
        Lines.lines[top].decorations.push(Decorations.createDecoration(left, top, length, colorId, lineBreak, 'selection'));
      }
    }
    function deleteSelectionDecoration(top: number) {
      const decoration = Lines.lines[top].decorations.find(decoration => decoration.type === 'selection');
      if (decoration !== undefined)
        decoration.length = 0;
    }
  }
  public static clearSelection() {
    if (this.rangeStart !== null) {
      this.rangeStart = null;
      for (let i = 0; i < Lines.lines.length; i++) {
        const decoration = Lines.lines[i].decorations.find(decoration => decoration.type === 'selection');
        if (decoration !== undefined)
          decoration.length = 0;
      }
      Caret.rangeStart = null;
    }
  }
}

class Lines {
  private static lastLineId: number = 0;
  static lines: Line[] = [];

  public static appendLine(tokens: Token[] | null = null) {
    const line = new Line(Lines.lastLineId++);
    if (tokens !== null) {
      line.tokens = tokens;
    }
    Lines.lines.push(line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const decorations = document.createElement('span');
    const lineNumber = document.createElement('span');
    decorations.classList.add('decorations');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = Lines.lines.length.toString();
    newLine.append(decorations, lineNumber);
    for (let token of line.tokens) {
      const newToken: HTMLSpanElement = document.createElement('span');
      newToken.id = `token${token.tokenId}`;
      newToken.classList.add('token');
      newToken.textContent = token.text;
      newLine.appendChild(newToken);
    }
    document.getElementById('editorSpace')?.appendChild(newLine);

    line.decorations.push(Decorations.createDecoration(0, Lines.lines.length - 1, 0, SELECTION_COLOR_ID, false, 'selection'));
  }
  public static insertLine(top: number, tokens: Token[] | null = null) {
    const line = new Line(Lines.lastLineId++);
    if (tokens === null || tokens.length === 0) {
      line.tokens = [new Token('', { name: 'text', colorId: 'black' })];
    } else {
      line.tokens = tokens;
    }
    Lines.lines.splice(top, 0, line);

    const newLine: HTMLDivElement = document.createElement('div');
    newLine.id = `line${line.lineId}`;
    newLine.classList.add('line');
    const decorations = document.createElement('span');
    const lineNumber = document.createElement('span');
    decorations.classList.add('decorations');
    lineNumber.classList.add('lineNumber');
    lineNumber.textContent = (top + 1).toString();
    newLine.append(decorations, lineNumber);
    for (let token of line.tokens) {
      const newToken: HTMLSpanElement = document.createElement('span');
      newToken.id = `token${token.tokenId}`;
      newToken.classList.add('token');
      newToken.textContent = token.text;
      newLine.appendChild(newToken);
    }
    if (top === 0)
      document.getElementById('editorSpace')?.insertBefore(newLine, document.getElementById('editorSpace')?.firstChild!);
    else if (top === Lines.lines.length - 1)
      document.getElementById('editorSpace')?.appendChild(newLine);
    else
      document.getElementById('editorSpace')?.insertBefore(newLine, document.getElementById('line' + this.lines[top + 1].lineId.toString()));

    line.decorations.push(Decorations.createDecoration(0, top, 0, SELECTION_COLOR_ID, false, 'selection'));
  }
  public static deleteLine(top: number) {
    document.getElementById('line' + this.lines[top].lineId.toString())?.remove();
    Lines.lines.splice(top, 1);
  }
  public static swapLine(top: number, length: number, isUp: boolean) {
    if (isUp) {
      if (top === 0)
        return;
      const move = document.getElementById('line' + this.lines[top - 1].lineId.toString());
      if (top + length === this.lines.length)
        document.getElementById('editorSpace')?.appendChild(move!);
      else
        document.getElementById('editorSpace')?.insertBefore(move!, document.getElementById('line' + this.lines[top + length].lineId.toString()));
      Lines.lines.splice(top - 1, 0, ...Lines.lines.splice(top, length));
    } else {
      if (top + length === this.lines.length)
        return;
      const move = document.getElementById('line' + this.lines[top + length].lineId.toString());
      document.getElementById('editorSpace')?.insertBefore(move!, document.getElementById('line' + this.lines[top].lineId.toString()));
      Lines.lines.splice(top + 1, 0, ...Lines.lines.splice(top, length));
    }
  }

  public static deleteRange(first: { left: number, top: number }, second: { left: number, top: number }) {
    const start = first.top < second.top ? first : (first.top === second.top && first.left < second.left ? first : second);
    const end = first.top < second.top ? second : (first.top === second.top && first.left < second.left ? second : first);
    if (start.top === end.top) {
      Lines.lines[start.top].deleteText(start.left, start.top, end.left - start.left);
    } else {
      Lines.lines[end.top].deleteText(0, end.top, end.left);
      for (let i = end.top - 1; i > start.top; i--)
        Lines.deleteLine(i);
      Lines.lines[start.top].deleteText(start.left, start.top, Lines.lines[start.top].length - start.left);
      Lines.lines[start.top + 1].moveToken(Lines.lines[start.top + 1].tokens, start.left, start.top);
      Lines.deleteLine(start.top + 1);
    }
  }
}

const matchWhiteSpace = /\s/;
const matchAllWhiteSpaceString = /^\s+$/;
const matchWhiteSpaceString = /\s+/g;
class Line {
  public constructor(lineId: number) {
    this.lineId = lineId;
  }

  readonly lineId: number;
  tokens: Token[] = [];
  decorations: Decoration[] = [];

  get text() {
    return this.tokens.map(token => token.text).join('');
  }
  get length() {
    return this.tokens.reduce((acc, token) => acc + token.text.length, 0);
  }

  public insertText(text: string, left: number, top: number, defaultKind: Kind = DEFAULT_KIND) {
    const isOnlyWhiteSpace = matchAllWhiteSpaceString.test(text);
    if (matchWhiteSpace.test(text) && isOnlyWhiteSpace === false) {
      let i = 0;
      for (let match of text.matchAll(matchWhiteSpaceString)) {
        if (i !== match.index) {
          this.insertText(text.slice(i, match.index), left + i, top, defaultKind);
          i += match.index - i;
        }

        this.insertText(match[0], left + i, top, defaultKind);
        i += match[0].length;
      }
      if (i !== text.length) {
        this.insertText(text.slice(i), left + i, top, defaultKind);
      }
      return;
    }

    if (left === 0) {
      const afterIsOnlyWhiteSpace = this.tokens.length === 0 ? false : matchAllWhiteSpaceString.test(this.tokens[0].text);
      if (isOnlyWhiteSpace) {
        if (afterIsOnlyWhiteSpace) {
          this.tokens[0].text = text + this.tokens[0].text;
        } else {
          this.insertToken(0, new Token(text, defaultKind));
        }
      } else {
        if (afterIsOnlyWhiteSpace) {
          this.insertToken(0, new Token(text, defaultKind));
        } else {
          if (this.tokens.length === 0)
            this.insertToken(0, new Token(text, defaultKind));
          else
            this.tokens[0].text = text + this.tokens[0].text;
        }
      }
      return;
    }

    let position = 0;
    let i = 0;
    while (true) {
      if (position === left) {
        if (i === this.tokens.length) {
          const beforeIsOnlyWhiteSpace = matchAllWhiteSpaceString.test(this.tokens[i - 1].text);
          if ((isOnlyWhiteSpace && beforeIsOnlyWhiteSpace === false) || (isOnlyWhiteSpace === false && beforeIsOnlyWhiteSpace))
            this.insertToken(i, new Token(text, defaultKind));
          else
            this.tokens[i - 1].text = this.tokens[i - 1].text + text;
        } else {
          const beforeIsOnlyWhiteSpace = this.tokens[i - 1] ? matchAllWhiteSpaceString.test(this.tokens[i - 1].text) : false;
          const afterIsOnlyWhiteSpace = matchAllWhiteSpaceString.test(this.tokens[i].text);
          if (isOnlyWhiteSpace) {
            if (beforeIsOnlyWhiteSpace && afterIsOnlyWhiteSpace) {
              this.tokens[i - 1].text = this.tokens[i - 1].text + text + this.tokens[i].text;
              this.deleteToken(this.tokens[i].tokenId);
            } else if (beforeIsOnlyWhiteSpace) {
              this.tokens[i - 1].text = this.tokens[i - 1].text + text;
            } else if (afterIsOnlyWhiteSpace) {
              this.tokens[i].text = text + this.tokens[i].text;
            } else {
              this.insertToken(i, new Token(text, DEFAULT_KIND));
            }
          } else {
            if (beforeIsOnlyWhiteSpace && afterIsOnlyWhiteSpace) {
              this.insertToken(i, new Token(text, defaultKind));
            } else if (beforeIsOnlyWhiteSpace) {
              this.tokens[i].text = text + this.tokens[i].text;
            } else if (afterIsOnlyWhiteSpace) {
              if (this.tokens[i - 1])
                this.tokens[i - 1].text = this.tokens[i - 1].text + text;
              else
                this.insertToken(0, new Token(text, defaultKind));
            } else {
              if (this.tokens[i - 1]) {
                this.tokens[i - 1].text = this.tokens[i - 1].text + text + this.tokens[i].text;
                this.deleteToken(this.tokens[i].tokenId);
              } else {
                this.tokens[0].text = text + this.tokens[0].text;
              }
            }
          }
        }
        break;
      } else if (position > left) {
        const beforeIsOnlyWhiteSpace = this.tokens[i - 1] ? matchAllWhiteSpaceString.test(this.tokens[i - 1].text.slice(0, left - position)) : false;
        const afterIsOnlyWhiteSpace = this.tokens[i - 1] ? matchAllWhiteSpaceString.test(this.tokens[i - 1].text.slice(left - position)) : false;
        if (isOnlyWhiteSpace) {
          if (beforeIsOnlyWhiteSpace && afterIsOnlyWhiteSpace) {
            this.tokens[i - 1].text = this.tokens[i - 1].text.slice(0, left - position) + text + this.tokens[i - 1].text.slice(left - position);
          } else if (beforeIsOnlyWhiteSpace) {
            this.tokens[i - 1].text = this.tokens[i - 1].text.slice(0, left - position) + text;
            this.insertToken(i, new Token(this.tokens[i - 1].text.slice(left - position), this.tokens[i - 1].kind));
          } else if (afterIsOnlyWhiteSpace) {
            const temp = this.tokens[i - 1].text;
            this.tokens[i - 1].text = temp.slice(0, left - position);
            this.insertToken(i, new Token(text + temp.slice(left - position), defaultKind));
          } else {
            const temp = this.tokens[i - 1].text;
            this.tokens[i - 1].text = temp.slice(0, left - position);
            this.insertToken(i, new Token(text, defaultKind));
            this.insertToken(i + 1, new Token(temp.slice(left - position), this.tokens[i - 1].kind));
          }
        } else {
          if (beforeIsOnlyWhiteSpace && afterIsOnlyWhiteSpace) {
            const temp = this.tokens[i - 1].text;
            this.tokens[i - 1].text = temp.slice(0, left - position);
            this.insertToken(i, new Token(text, defaultKind));
            this.insertToken(i + 1, new Token(temp.slice(left - position), this.tokens[i - 1].kind));
          } else if (beforeIsOnlyWhiteSpace) {
            const temp = this.tokens[i - 1].text;
            this.tokens[i - 1].text = temp.slice(0, left - position);
            this.insertToken(i, new Token(text + temp.slice(left - position), defaultKind));
          } else if (afterIsOnlyWhiteSpace) {
            const temp = this.tokens[i - 1].text;
            this.tokens[i - 1].text = temp.slice(0, left - position) + text;
            this.insertToken(i, new Token(temp.slice(left - position), this.tokens[i - 1].kind));
          } else {
            this.tokens[i - 1].text = this.tokens[i - 1].text.slice(0, left - position) + text + this.tokens[i - 1].text.slice(left - position);
          }
        }
        break;
      }
      if (i === this.tokens.length)
        break;
      position += this.tokens[i].text.length;
      i++;
    }
  }
  public deleteText(left: number, top: number, length: number) {
    if (length <= 0)
      return;

    if (left < 0) {
      const index = Lines.lines.indexOf(this);
      if (index > 0) {
        if (this.tokens.length !== 0) {
          if (Lines.lines[index - 1].tokens.length === 0) {
            Lines.lines[index - 1].insertText('', 0, top);
          }
          if (left === -1) {
            Lines.lines[index - 1].tokens[Lines.lines[index - 1].tokens.length - 1].text = Lines.lines[index - 1].tokens[Lines.lines[index - 1].tokens.length - 1].text + this.tokens[0].text.slice(left + length);
          } else {
            Lines.lines[index - 1].tokens[Lines.lines[index - 1].tokens.length - 1].text = Lines.lines[index - 1].tokens[Lines.lines[index - 1].tokens.length - 1].text.slice(0, left + 1) + this.tokens[0].text.slice(left + length);
          }
          this.moveToken(this.tokens.slice(1), Lines.lines[index - 1].tokens.length, index - 1);
        } else {
          if (left + 1 < 0) {
            Lines.lines[index - 1].tokens[Lines.lines[index - 1].tokens.length - 1].text = Lines.lines[index - 1].tokens[Lines.lines[index - 1].tokens.length - 1].text.slice(0, left + 1);
          }
        }
        Lines.deleteLine(index);
      } else {
        if (this.tokens.length !== 0) {
          if (left + length < 0)
            this.tokens[0].text = '';
          else
            this.tokens[0].text = this.tokens[0].text.slice(left + length);
        }
      }
      return;
    } else if (left === this.length && length === 1) {
      const index = Lines.lines.indexOf(this);
      if (index < Lines.lines.length - 1) {
        if (Lines.lines[index + 1].tokens.length !== 0) {
          if (this.tokens.length !== 0) {
            this.tokens[this.tokens.length - 1].text = this.tokens[this.tokens.length - 1].text + Lines.lines[index + 1].tokens[0].text;
            Lines.lines[index + 1].moveToken(Lines.lines[index + 1].tokens.slice(1), this.tokens.length, index);
          } else {
            Lines.lines[index + 1].moveToken(Lines.lines[index + 1].tokens, this.tokens.length, index);
          }
        }
        Lines.deleteLine(index + 1);
      }
      return;
    }

    if (length === -1) {
      let position = 0;
      let i = 0;
      while (true) {
        if (position === left) {
          this.tokens[i].text = this.tokens[i].text.slice(1);
          break;
        } else if (position > left) {
          this.tokens[i - 1].text = this.tokens[i - 1].text.slice(0, left - position) + this.tokens[i - 1].text.slice(left + 1);
          break;
        }
        if (i === this.tokens.length)
          break;
        position += this.tokens[i].text.length;
        i++;
      }
      return;
    }

    let position = 0;
    let i = 0;
    while (true) {
      if (position === left) {
        if (this.tokens.length <= i)
          break;
        if (this.tokens[i].text.length <= left + length - position) {
          position += this.tokens[i].text.length;
          left += this.tokens[i].text.length;
          length -= this.tokens[i].text.length;
          Lines.lines[top].deleteToken(this.tokens[i].tokenId);
          continue;
        } else {
          if (i === this.tokens.length)
            break;
          this.tokens[i].text = this.tokens[i].text.slice(length);
          break;
        }
      } else if (position > left) {
        if (this.tokens[i - 1].text.length <= left + length - position) {
          position += this.tokens[i - 1].text.length;
          left += this.tokens[i - 1].text.length;
          length -= this.tokens[i - 1].text.length;
          Lines.lines[top].deleteToken(this.tokens[i - 1].tokenId);
          continue;
        } else {
          if (left - position + length >= 0)
            this.tokens[i - 1].text = this.tokens[i - 1].text.slice(0, left - position);
          else
            this.tokens[i - 1].text = this.tokens[i - 1].text.slice(0, left - position) + this.tokens[i - 1].text.slice(left - position + length);
          break;
        }
      }
      if (i === this.tokens.length)
        break;
      position += this.tokens[i].text.length;
      i++;
    }
  }

  public insertToken(index: number, token: Token) {
    this.tokens.splice(index, 0, token);
    const lineElement = document.getElementById('line' + this.lineId.toString());
    const newToken: HTMLSpanElement = document.createElement('span');
    newToken.id = `token${token.tokenId}`;
    newToken.classList.add('token');
    newToken.textContent = token.text;
    if (index === this.tokens.length - 1)
      lineElement?.appendChild(newToken);
    else
      lineElement?.insertBefore(newToken, lineElement.childNodes[index + 2]);
  }
  public deleteToken(tokenId: number) {
    const token = document.getElementById(`token${tokenId}`);
    token?.remove();
    this.tokens.splice(this.tokens.findIndex(token => token.tokenId === tokenId), 1);
  }
  public moveToken(tokens: Token[], toIndex: number, toTop: number) {
    const originalToIndex = toIndex;
    const lineElement = document.getElementById(`line${Lines.lines[toTop].lineId}`);
    if (lineElement === null)
      return;
    const isInsertAtEnd = toIndex === Lines.lines[toTop].tokens.length;
    for (let token of tokens) {
      Lines.lines[toTop].tokens.splice(toIndex++, 0, token);

      const tokenElement = document.getElementById(`token${token.tokenId}`);
      if (tokenElement === null)
        return;
      tokenElement.remove();
      if (isInsertAtEnd)
        lineElement.appendChild(tokenElement);
      else
        lineElement.insertBefore(tokenElement, lineElement.childNodes[originalToIndex]);
    }
    this.tokens = this.tokens.filter(x => tokens.includes(x) === false);
  }

  public startNewLine(left: number) {
    const index = Lines.lines.indexOf(this);
    let length = 0;
    for (let i = 0; i <= this.tokens.length; i++) {
      if (length >= left) {
        if (length === left) {
          Lines.insertLine(index + 1, this.tokens.slice(i));
          for (let token of this.tokens.slice(i))
            this.deleteToken(token.tokenId);
        } else {
          const target = this.tokens[i - 1];
          const clone = new Token(target.text.slice(left - length), target.kind);

          target.text = target.text.slice(0, left - length);

          Lines.insertLine(index + 1, [clone, ...this.tokens.slice(i)]);

          for (let token of this.tokens.slice(i))
            this.deleteToken(token.tokenId);
        }
        Caret.set(0, index + 1);
        return;
      }
      length += this.tokens[i].text.length;
    }
  }
}
class Token {
  private static lastTokenId: number = 0;

  constructor(text: string, kind: Kind, tokenId: number = Token.lastTokenId++) {
    this.tokenId = tokenId;
    this.text = text;
    this.kind = kind;
  }

  public readonly tokenId: number;
  private _text: string = '';
  private _kind: Kind = { name: '', colorId: '' };

  public get text() {
    return this._text;
  }
  public get kind() {
    return this._kind;
  }

  public set text(text: string) {
    if (text !== this._text) {
      this._text = text;
      const tokenElement = document.getElementById(`token${this.tokenId}`);
      if (tokenElement !== null) {
        tokenElement.textContent = text;
      }
    }
  }
  public set kind(kind: Kind) {
    this._kind = kind;
  }
}
interface Kind {
  name: string;
  colorId: string;
};

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
  private static lastDecorationId: number = 0;
  private static readonly lineBreakExtendWidth = 7;

  public static createDecoration(left: number, top: number, length: number, colorId: string, lineBreak = false, type?: 'selection') {
    const id = Decorations.lastDecorationId++;

    const decorationElement: HTMLSpanElement = document.createElement('span');
    decorationElement.id = `decoration${id}`;
    decorationElement.classList.add('decoration');
    decorationElement.style.background = BackgroundColors.colors.find(color => color.id === colorId)?.color ?? '';
    if (left === 0 && length === 0) {
      decorationElement.style.left = '0px';
      if (lineBreak)
        decorationElement.style.width = `${Decorations.lineBreakExtendWidth}px`;
      else
        decorationElement.style.width = '0px';
    } else {
      const text = Lines.lines[top].text;
      if (left === 0)
        decorationElement.style.left = '0px';
      else
        decorationElement.style.left = `${measureTextWidth(text.slice(0, left))}px`;
      if (length === 0) {
        if (lineBreak)
          decorationElement.style.width = `${Decorations.lineBreakExtendWidth}px`;
        else
          decorationElement.style.width = '0px';
      } else
        decorationElement.style.width = `${measureTextWidth(text.slice(left, left + length)) + (lineBreak ? this.lineBreakExtendWidth : 0)}px`;
    }
    const lineElement = document.getElementById(`line${Lines.lines[top].lineId}`);
    lineElement?.children[0].appendChild(decorationElement);

    const decoration = new Decoration(Decorations.lastDecorationId++, decorationElement, left, length, colorId, type);
    return decoration;
  }
  public static measureDecorationLeftAndWidth(decoration: Decoration, top: number, lineBreak = false) {
    const text = Lines.lines[top].text;
    return {
      left: measureTextWidth(text.slice(0, decoration.left)),
      width: measureTextWidth(text.slice(decoration.left, decoration.left + decoration.length)) + (lineBreak ? this.lineBreakExtendWidth : 0)
    };
  }
  public static measureDecorationLeft(decoration: Decoration, top: number) {
    const text = Lines.lines[top].text;
    return measureTextWidth(text.slice(0, decoration.left));
  }
  public static measureDecorationWidth(decoration: Decoration, top: number, lineBreak = false) {
    const text = Lines.lines[top].text;
    return measureTextWidth(text.slice(decoration.left, decoration.left + decoration.length)) + (lineBreak ? this.lineBreakExtendWidth : 0);
  }
}
class Decoration {
  constructor(decorationId: number, element: HTMLSpanElement, left: number, length: number, colorId: string, type?: 'selection') {
    this.decorationId = decorationId;
    this.element = element;
    this._left = left;
    this._length = length;
    this._colorId = colorId;
    this.type = type;
  }

  readonly decorationId: number;
  readonly element: HTMLSpanElement;
  private _left: number;
  private _length: number;
  private _colorId: string;
  type: 'selection' | undefined;

  public get length() {
    return this._length;
  }
  public set length(length: number) {
    this._length = length;
    if (length === 0)
      this.element.style.width = '0px';
    else
      this.element.style.width = `${Decorations.measureDecorationWidth(this, this.top)}px`;
  }

  public get left() {
    return this._left;
  }
  public set left(left: number) {
    this._left = left;
    if (left === 0)
      this.element.style.left = '0px';
    else
      this.element.style.left = `${Decorations.measureDecorationLeft(this, this.top)}px`;
  }

  public get colorId() {
    return this._colorId;
  }
  public set colorId(colorId: string) {
    this._colorId = colorId;
    this.element.style.background = BackgroundColors.colors.find(color => color.id === colorId)?.color ?? '';
  }

  public changeLeftAndWidth(left: number, width: number, lineBreak = false) {
    this.left = left;
    this.length = width;
    const leftAndWidth = Decorations.measureDecorationLeftAndWidth(this, this.top, lineBreak);
    this.element.style.left = `${leftAndWidth.left}px`;
    this.element.style.width = `${leftAndWidth.width}px`;
  }

  public changeTop(top: number) {
    Lines.lines[this.top].decorations.splice(Lines.lines[this.top].decorations.indexOf(this), 1);
    Lines.lines[top].decorations.push(this);
    this.element.remove();
    const lineElement = document.getElementById(`line${Lines.lines[top].lineId}`);
    lineElement?.children[0].appendChild(this.element);
  }

  public delete() {
    this.element.remove();
    Lines.lines[this.top].decorations.splice(Lines.lines[this.top].decorations.indexOf(this), 1);
  }

  private get top() {
    return Lines.lines.findIndex(line => line.decorations.includes(this));
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
    await delay(3000000000);
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
    
    const marginLeft = parseFloat(getComputedStyle(document.querySelector('.decorations:has(*)')!).marginLeft!.replace('px', ''));

    if (x <= marginLeft)
      return { left: 0, top };

    const textWidth = measureTextWidth(text);
    if (textWidth <= x)
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

type DebounceFunction = (...args: any[]) => void;
function debounce<T extends DebounceFunction>(func: T, wait: number, immediate: boolean = false): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    const callNow = immediate && timeoutId === null;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func.apply(this, args);
      }
    }, wait);

    if (callNow) {
      func.apply(this, args);
    }
  } as T;
}

function delay(milliseconds: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}
async function repaint() {
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));
}

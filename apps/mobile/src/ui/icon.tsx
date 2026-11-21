import { Image } from 'react-native';
import { colors } from '@ui/presentation';
import arrowLeft from '@ui/icons/arrow-left.png';
import pencilOutline from '@ui/icons/pencil-outline.png';
import check from '@ui/icons/check.png';
import close from '@ui/icons/close.png';
import headphones from '@ui/icons/headphones.png';
import bookOpenVariant from '@ui/icons/book-open-variant.png';
import bookOpenOutline from '@ui/icons/book-open-outline.png';
import downloadBoxOutline from '@ui/icons/download-box-outline.png';
import plusBoxOutline from '@ui/icons/plus-box-outline.png';
import skipPrevious from '@ui/icons/skip-previous.png';
import skipNext from '@ui/icons/skip-next.png';
import formatSize from '@ui/icons/format-size.png';
import play from '@ui/icons/play.png';
import pause from '@ui/icons/pause.png';
import chevronRight from '@ui/icons/chevron-right.png';
import chevronDown from '@ui/icons/chevron-down.png';
import chevronUp from '@ui/icons/chevron-up.png';
import trashCanOutline from '@ui/icons/trash-can-outline.png';
import downloadMultiple from '@ui/icons/download-multiple.png';
import downloadOutline from '@ui/icons/download-outline.png';
import checkCircleOutline from '@ui/icons/check-circle-outline.png';
import accountVoice from '@ui/icons/account-voice.png';
import cogOutline from '@ui/icons/cog-outline.png';

const icons = {
  'cog-outline': cogOutline,
  'arrow-left': arrowLeft,
  'pencil-outline': pencilOutline,
  'check': check,
  'close': close,
  'headphones': headphones,
  'book-open-variant': bookOpenVariant,
  'book-open-outline': bookOpenOutline,
  'download-box-outline': downloadBoxOutline,
  'plus-box-outline': plusBoxOutline,
  'skip-previous': skipPrevious,
  'skip-next': skipNext,
  'format-size': formatSize,
  'play': play,
  'pause': pause,
  'chevron-right': chevronRight,
  'chevron-down': chevronDown,
  'chevron-up': chevronUp,
  'trash-can-outline': trashCanOutline,
  'download-multiple': downloadMultiple,
  'download-outline': downloadOutline,
  'check-circle-outline': checkCircleOutline,
  'account-voice': accountVoice,
};

export type IconName = keyof typeof icons;

export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number | undefined; color?: string | undefined }) {
  return <Image accessible={false} source={icons[name]} style={{ width: size, height: size, tintColor: color }} />;
}

# Forest & Flowers hero — supplied forest photograph

The artist supplied forest-desktop-wmbkxdfmuugtzx6l.jpg in this conversation.
Original: 1920 × 1200, sRGB, no embedded EXIF/GPS or ICC profile detected.
forest-bluebells-original.jpg is a byte-identical preserved copy. No independent
photographer attribution or licensing claim is inferred from the filename.

Display derivatives: forest-bluebells-{768,1280,1920}.webp, quality 82/method 6.
Smaller sizes use proportional Lanczos resizing. No crop, recoloring, sharpening,
contrast adjustment, generated imagery or pixel alteration beyond WebP encoding.

ForestHero.tsx uses width-based responsive sources. Its sizes account for the
1.6:1 image width needed to cover the tall hero, avoiding an undersized/blurry
phone or tablet source. Existing cover presentation
handles viewport cropping: desktop remains 53% center; mobile uses 64% center to
retain the sunlit trees and bluebells. Dark forest-green CSS gradients provide
contrast at the left/bottom without modifying the source pixels. Original hero
asset forest-and-flowers.png remains untouched. Hero text, links, semantic heading,
height rules, collection statement and all artwork photographs are unchanged.

To revert, restore ForestHero.tsx's prior image src and the previous gradient/mobile
position rules, or revert this focused PR. No other pages depend on the new assets.

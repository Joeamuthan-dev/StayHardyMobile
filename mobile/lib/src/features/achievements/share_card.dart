import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../domain/badge_catalogue.dart';
import '../../theme/aura_theme.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import 'badge_medal.dart';

/// The image a badge gets shared as.
///
/// Built from the same widgets and tokens as the rest of the app rather than
/// composed on a canvas, so it inherits the type scale and palette and cannot
/// drift out of step with them.
///
/// Deliberately **always dark**, whatever theme the app is in. A share card
/// lands in someone else's feed next to other people's images: the near-black
/// ground is what makes it recognisable, and a near-white card on a near-white
/// timeline simply disappears.
class ShareCard extends StatelessWidget {
  const ShareCard({
    super.key,
    required this.def,
    required this.headline,
    this.footnote,
  });

  final BadgeDef def;
  final String headline;
  final String? footnote;

  /// Logical size. Rasterised at [pixelRatio] for the actual image, so every
  /// number in this widget is an ordinary app-scale value.
  static const logicalWidth = 400.0;
  static const logicalHeight = 500.0;

  /// 1080 × 1350 — portrait, and tall enough for a story frame without a crop.
  static const pixelRatio = 2.7;

  @override
  Widget build(BuildContext context) {
    const t = AuraTokens.dark;
    final text = AuraType.textTheme(t.textPrimary, t.textSecondary);

    return Theme(
      // The card carries the dark palette explicitly rather than reading the
      // ambient theme, so a user in light mode shares the same image everyone
      // else does.
      data: AuraTheme.dark(),
      child: SizedBox(
        width: logicalWidth,
        height: logicalHeight,
        child: ColoredBox(
          color: t.bg,
          child: Padding(
            padding: const EdgeInsets.all(Space.xl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(),
                BadgeMedal(def: def, earned: true, size: 96),
                const SizedBox(height: Space.xl),
                Text(headline, style: text.displayMedium),
                const SizedBox(height: Space.md),
                Text(
                  def.description,
                  style: text.bodyLarge?.copyWith(color: t.textSecondary),
                ),
                const Spacer(),
                Container(height: Dimens.hairline, color: t.border),
                const SizedBox(height: Space.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('STAYHARDY',
                        style: text.labelLarge?.copyWith(color: t.accent)),
                    if (footnote != null)
                      Text(
                        footnote!.toUpperCase(),
                        style:
                            text.labelLarge?.copyWith(color: t.textMuted),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Renders a [ShareCard] off-screen and hands the PNG to the OS share sheet.
///
/// **Nothing is sent anywhere by this code.** It writes an image into the app's
/// own cache directory and opens the system sheet; the user chooses the
/// destination there and confirms it, or dismisses it. That is also why the
/// card is never shown in-app first — it exists only as the image the user is
/// about to look at in the sheet.
///
/// The card is laid out in an isolated render pipeline rather than as a hidden
/// widget in the tree. A hidden widget would be constrained by the phone's
/// screen, which is how share cards end up letterboxed at the wrong aspect
/// ratio on small devices.
abstract final class BadgeSharing {
  static Future<void> share({
    required BuildContext context,
    required BadgeDef def,
    required String headline,
    String? footnote,
  }) async {
    // Captured before the first await: the element may be gone afterwards.
    final box = context.findRenderObject() as RenderBox?;
    final origin =
        box == null ? null : box.localToGlobal(Offset.zero) & box.size;

    final bytes = await _render(
      ShareCard(def: def, headline: headline, footnote: footnote),
    );
    if (bytes == null) return;

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/stayhardy-${def.key}.png');
    await file.writeAsBytes(bytes, flush: true);

    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'image/png')],
      // iPads throw without an anchor for the popover; harmless on Android.
      sharePositionOrigin: origin,
    );
  }

  /// Lays the card out in its own render tree and rasterises it.
  static Future<Uint8List?> _render(Widget card) async {
    final repaint = RenderRepaintBoundary();
    final view = WidgetsBinding.instance.platformDispatcher.views.first;

    const size = Size(ShareCard.logicalWidth, ShareCard.logicalHeight);
    final renderView = RenderView(
      view: view,
      child: RenderPositionedBox(child: repaint),
      configuration: ViewConfiguration(
        physicalConstraints: BoxConstraints.tight(size * ShareCard.pixelRatio),
        logicalConstraints: BoxConstraints.tight(size),
        devicePixelRatio: ShareCard.pixelRatio,
      ),
    );

    final pipeline = PipelineOwner()..rootNode = renderView;
    renderView.prepareInitialFrame();

    final buildOwner = BuildOwner(focusManager: FocusManager());
    final element = RenderObjectToWidgetAdapter<RenderBox>(
      container: repaint,
      child: Directionality(textDirection: TextDirection.ltr, child: card),
    ).attachToRenderTree(buildOwner);

    buildOwner
      ..buildScope(element)
      ..finalizeTree();
    pipeline
      ..flushLayout()
      ..flushCompositingBits()
      ..flushPaint();

    final image = await repaint.toImage(pixelRatio: ShareCard.pixelRatio);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return data?.buffer.asUint8List();
  }
}

import 'package:flutter/material.dart';

import '../domain/consistency_trend.dart';
import '../theme/aura_tokens.dart';

/// The one place a consistency band becomes a colour.
///
/// Shared rather than duplicated because the Stats curve, its pill and the
/// weekly review all paint the same four bands — and two copies of a colour
/// ramp is how the review ends up calling 62% amber while the chart calls it
/// green on the very same data.
///
/// Every value is derived from a theme token, never a literal, so light mode
/// resolves correctly without a second table.
Color zoneColour(ConsistencyZone z, AuraTokens t) => switch (z) {
      ConsistencyZone.lockedIn => t.accent,
      ConsistencyZone.steady => t.warn,
      // There is no orange token, and inventing a hex would break light mode.
      // Halfway between the two neighbouring tokens is orange in both themes
      // by construction.
      ConsistencyZone.slipping => Color.lerp(t.warn, t.danger, 0.55)!,
      ConsistencyZone.down => t.danger,
    };

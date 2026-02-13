<?php
/**
 * SVG Logo Inliner
 * Replaces the Site Logo block's <img> with inline SVG markup for full CSS control.
 */

namespace FiveMTS\ThemeUtilities;

class SvgLogoInliner
{
    /**
     * Register the render filter for the Site Logo block.
     */
    public static function init(): void
    {
        add_filter('render_block_core/site-logo', [self::class, 'render'], 10, 2);
    }

    /**
     * Filter the Site Logo block output, replacing <img> with inline SVG.
     *
     * @param string $blockContent The block's rendered HTML.
     * @param array  $block        The parsed block data.
     * @return string Modified HTML with inline SVG, or original HTML if not applicable.
     */
    public static function render(string $blockContent, array $block): string
    {
        $logoId = get_theme_mod('custom_logo');
        if (!$logoId) {
            return $blockContent;
        }

        $filePath = get_attached_file($logoId);
        if (!$filePath || strtolower(pathinfo($filePath, PATHINFO_EXTENSION)) !== 'svg') {
            return $blockContent;
        }

        $svgContent = file_get_contents($filePath);
        if (!$svgContent) {
            return $blockContent;
        }

        // Extract attributes from the <img> tag
        if (!preg_match('/<img\s[^>]*>/i', $blockContent, $imgMatch)) {
            return $blockContent;
        }

        $imgTag = $imgMatch[0];
        $attributes = self::parseImgAttributes($imgTag);

        // Prepare the inline SVG
        $svg = self::prepareSvg($svgContent, $attributes);
        if (!$svg) {
            return $blockContent;
        }

        return str_replace($imgTag, $svg, $blockContent);
    }

    /**
     * Extract relevant attributes from an <img> tag.
     *
     * @param string $imgTag The full <img> tag string.
     * @return array Associative array of attribute name => value.
     */
    private static function parseImgAttributes(string $imgTag): array
    {
        $attributes = [];
        $preserve = ['class', 'id', 'style', 'width', 'height'];

        foreach ($preserve as $attr) {
            if (preg_match('/\b' . preg_quote($attr, '/') . '="([^"]*)"/i', $imgTag, $match)) {
                $attributes[$attr] = $match[1];
            }
        }

        // Capture alt text separately for accessibility
        if (preg_match('/\balt="([^"]*)"/i', $imgTag, $match)) {
            $attributes['alt'] = $match[1];
        }

        return $attributes;
    }

    /**
     * Inject attributes into the SVG and prepare it for output.
     *
     * @param string $svgContent Raw SVG file content.
     * @param array  $attributes Attributes extracted from the <img> tag.
     * @return string|null The prepared SVG string, or null on parse failure.
     */
    private static function prepareSvg(string $svgContent, array $attributes): ?string
    {
        // Validate that the content contains an <svg> tag
        if (!preg_match('/<svg\b/i', $svgContent)) {
            return null;
        }

        // Build attribute strings to inject into the <svg> tag
        $inject = '';

        if (!empty($attributes['class'])) {
            $inject .= ' class="' . esc_attr($attributes['class']) . '"';
        }

        if (!empty($attributes['id'])) {
            $inject .= ' id="' . esc_attr($attributes['id']) . '"';
        }

        if (!empty($attributes['style'])) {
            $inject .= ' style="' . esc_attr($attributes['style']) . '"';
        }

        if (!empty($attributes['width'])) {
            $inject .= ' width="' . esc_attr($attributes['width']) . '"';
        }

        if (!empty($attributes['height'])) {
            $inject .= ' height="' . esc_attr($attributes['height']) . '"';
        }

        // Accessibility: alt text becomes aria-label, add role="img"
        if (!empty($attributes['alt'])) {
            $inject .= ' aria-label="' . esc_attr($attributes['alt']) . '"';
        }
        $inject .= ' role="img"';

        // Inject attributes into the opening <svg> tag
        $svg = preg_replace('/<svg\b/i', '<svg' . $inject, $svgContent, 1);

        return $svg;
    }
}

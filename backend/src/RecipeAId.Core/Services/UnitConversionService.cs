using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Core.Services;

public class UnitConversionService : IUnitConversionService
{
    // Base: mL
    private static readonly Dictionary<string, decimal> VolumeToMl = new()
    {
        ["tsp"]  = 4.92892m,
        ["tbsp"] = 14.7868m,
        ["floz"] = 29.5735m,
        ["cup"]  = 236.588m,
        ["pt"]   = 473.176m,
        ["qt"]   = 946.353m,
        ["gal"]  = 3785.41m,
        ["ml"]   = 1m,
        ["l"]    = 1000m,
    };

    // Base: g
    private static readonly Dictionary<string, decimal> MassToG = new()
    {
        ["oz"] = 28.3495m,
        ["lb"] = 453.592m,
        ["g"]  = 1m,
        ["kg"] = 1000m,
    };

    // Normalize user input to canonical key
    private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
    {
        // Volume
        ["tsp"] = "tsp", ["teaspoon"] = "tsp", ["teaspoons"] = "tsp",
        ["tbsp"] = "tbsp", ["tablespoon"] = "tbsp", ["tablespoons"] = "tbsp", ["tbs"] = "tbsp",
        ["fl oz"] = "floz", ["fl. oz."] = "floz", ["floz"] = "floz",
        ["fluid ounce"] = "floz", ["fluid ounces"] = "floz",
        ["cup"] = "cup", ["cups"] = "cup",
        ["pt"] = "pt", ["pint"] = "pt", ["pints"] = "pt",
        ["qt"] = "qt", ["quart"] = "qt", ["quarts"] = "qt",
        ["gal"] = "gal", ["gallon"] = "gal", ["gallons"] = "gal",
        ["ml"] = "ml", ["milliliter"] = "ml", ["milliliters"] = "ml",
        ["millilitre"] = "ml", ["millilitres"] = "ml", ["cc"] = "ml",
        ["l"] = "l", ["liter"] = "l", ["liters"] = "l",
        ["litre"] = "l", ["litres"] = "l",
        // Mass
        ["oz"] = "oz", ["ounce"] = "oz", ["ounces"] = "oz",
        ["lb"] = "lb", ["lbs"] = "lb", ["pound"] = "lb", ["pounds"] = "lb",
        ["g"] = "g", ["gram"] = "g", ["grams"] = "g",
        ["kg"] = "kg", ["kilogram"] = "kg", ["kilograms"] = "kg",
        // Temperature
        ["f"] = "f", ["°f"] = "f", ["fahrenheit"] = "f",
        ["c"] = "c", ["°c"] = "c", ["celsius"] = "c",
    };

    // Ingredient density table: g/mL
    private static readonly Dictionary<string, decimal> Densities = new(StringComparer.OrdinalIgnoreCase)
    {
        ["water"]             = 1.000m,
        ["milk"]              = 1.030m,
        ["heavy cream"]       = 0.994m,
        ["butter"]            = 0.911m,
        ["olive oil"]         = 0.911m,
        ["oil"]               = 0.911m,
        ["vegetable oil"]     = 0.911m,
        ["flour"]             = 0.529m,
        ["all-purpose flour"] = 0.529m,
        ["bread flour"]       = 0.529m,
        ["whole wheat flour"] = 0.529m,
        ["sugar"]             = 0.845m,
        ["granulated sugar"]  = 0.845m,
        ["brown sugar"]       = 0.722m,
        ["powdered sugar"]    = 0.560m,
        ["baking soda"]       = 1.080m,
        ["baking powder"]     = 0.900m,
        ["salt"]              = 1.217m,
        ["honey"]             = 1.420m,
        ["maple syrup"]       = 1.320m,
        ["cocoa powder"]      = 0.520m,
        ["cornstarch"]        = 0.606m,
        ["rice"]              = 0.750m,
        ["oats"]              = 0.340m,
        ["rolled oats"]       = 0.340m,
        ["vanilla extract"]   = 0.879m,
        ["chocolate chips"]   = 0.635m,
    };

    public ConvertResult Convert(decimal value, string fromUnit, string toUnit, string? ingredient = null)
    {
        var from = NormalizeUnit(fromUnit);
        var to   = NormalizeUnit(toUnit);

        decimal convertedValue;

        if (VolumeToMl.ContainsKey(from) && VolumeToMl.ContainsKey(to))
        {
            convertedValue = value * VolumeToMl[from] / VolumeToMl[to];
        }
        else if (MassToG.ContainsKey(from) && MassToG.ContainsKey(to))
        {
            convertedValue = value * MassToG[from] / MassToG[to];
        }
        else if (from == "f" && to == "c")
        {
            convertedValue = (value - 32) * 5 / 9;
        }
        else if (from == "c" && to == "f")
        {
            convertedValue = value * 9 / 5 + 32;
        }
        else if (VolumeToMl.ContainsKey(from) && MassToG.ContainsKey(to))
        {
            var density = RequireDensity(ingredient);
            var ml      = value * VolumeToMl[from];
            convertedValue = ml * density / MassToG[to];
        }
        else if (MassToG.ContainsKey(from) && VolumeToMl.ContainsKey(to))
        {
            var density = RequireDensity(ingredient);
            var grams   = value * MassToG[from];
            convertedValue = grams / density / VolumeToMl[to];
        }
        else
        {
            throw new InvalidOperationException(
                $"Cannot convert from '{fromUnit}' to '{toUnit}'. " +
                "Units must be in the same category (volume, mass, or temperature), " +
                "or a cross volume↔mass conversion with an ingredient specified.");
        }

        var displayFrom = GetDisplayUnit(from);
        var displayTo   = GetDisplayUnit(to);
        var rounded     = Math.Round(convertedValue, 2);

        return new ConvertResult(
            value,
            displayFrom,
            rounded,
            displayTo,
            $"{rounded:0.##} {displayTo}");
    }

    private static decimal RequireDensity(string? ingredient)
    {
        if (string.IsNullOrWhiteSpace(ingredient))
            throw new InvalidOperationException(
                "An ingredient name is required for volume↔mass conversions.");

        if (!Densities.TryGetValue(ingredient.Trim(), out var density))
            throw new InvalidOperationException(
                $"Density for '{ingredient}' is not in the lookup table. " +
                $"Known ingredients: {string.Join(", ", Densities.Keys)}.");

        return density;
    }

    private static string NormalizeUnit(string unit)
    {
        var trimmed = unit.Trim();
        if (Aliases.TryGetValue(trimmed, out var canonical))
            return canonical;

        throw new InvalidOperationException(
            $"Unknown unit: '{unit}'. Supported: tsp, tbsp, fl oz, cup, pt, qt, gal, mL, L, oz, lb, g, kg, °F, °C.");
    }

    private static string GetDisplayUnit(string canonical) => canonical switch
    {
        "tsp"  => "tsp",
        "tbsp" => "tbsp",
        "floz" => "fl oz",
        "cup"  => "cup",
        "pt"   => "pt",
        "qt"   => "qt",
        "gal"  => "gal",
        "ml"   => "mL",
        "l"    => "L",
        "oz"   => "oz",
        "lb"   => "lb",
        "g"    => "g",
        "kg"   => "kg",
        "f"    => "°F",
        "c"    => "°C",
        _      => canonical,
    };
}

using RecipeAId.Core.DTOs;

namespace RecipeAId.Core.Interfaces;

public interface IUnitConversionService
{
    ConvertResult Convert(decimal value, string fromUnit, string toUnit, string? ingredient = null);
}

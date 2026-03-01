using Microsoft.AspNetCore.Mvc;
using RecipeAId.Core.DTOs;
using RecipeAId.Core.Interfaces;

namespace RecipeAId.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ConvertController(IUnitConversionService converter) : ControllerBase
{
    [HttpPost]
    public ActionResult<ConvertResult> Post([FromBody] ConvertRequest request)
    {
        try
        {
            var result = converter.Convert(request.Value, request.FromUnit, request.ToUnit, request.Ingredient);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Conversion failed.", Detail = ex.Message });
        }
    }
}

from _typeshed import Incomplete

from influxdb_client.domain.expression import Expression

class FunctionExpression(Expression):
    openapi_types: Incomplete
    attribute_map: Incomplete
    discriminator: Incomplete
    def __init__(
        self, type: Incomplete | None = None, params: Incomplete | None = None, body: Incomplete | None = None
    ) -> None: ...
    @property
    def type(self): ...
    @type.setter
    def type(self, type) -> None: ...
    @property
    def params(self): ...
    @params.setter
    def params(self, params) -> None: ...
    @property
    def body(self): ...
    @body.setter
    def body(self, body) -> None: ...
    def to_dict(self): ...
    def to_str(self): ...
    def __eq__(self, other): ...
    def __ne__(self, other): ...
